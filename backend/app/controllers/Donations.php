<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Donations extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    /**
     * Get active campaigns
     * GET /api/donations/campaigns
     */
    public function campaigns()
    {
        $stmt = $this->db->raw(
            "SELECT c.*,
                    (SELECT COALESCE(SUM(d.amount), 0) 
                     FROM donations d 
                     WHERE d.campaign_id = c.id AND d.status = 'verified') AS live_collected
             FROM donation_campaigns c
             WHERE c.is_active = 1
             ORDER BY c.id ASC"
        );
        $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($campaigns as &$c) {
            $c['collected_amount'] = (float) ($c['live_collected'] ?? $c['collected_amount']);
            $c['target_amount'] = $c['target_amount'] !== null ? (float) $c['target_amount'] : null;
            $c['progress_percent'] = $c['target_amount'] > 0 
                ? min(100, round(($c['collected_amount'] / $c['target_amount']) * 100, 1))
                : null;
        }

        api_response($campaigns);
    }

    /**
     * Get official giving / payment options info
     * GET /api/donations/payment-info
     */
    public function payment_info()
    {
        api_response([
            'gcash' => [
                'name' => 'Danielle Psalm Rodel / Life Generation',
                'number' => '0963 590 3836',
                'qr_image' => '/images/gcash-sample-qr.png',
                'instructions' => 'Send via GCash Send Money or Express Send. Take a screenshot of the completed transfer with the Reference Number.'
            ],
            'maya' => [
                'name' => 'Life Generation Church Calapan',
                'number' => '0963 590 3836',
                'qr_image' => '',
                'instructions' => 'Send via Maya Send Money to Mobile Number or scan merchant QR.'
            ],
            'bank' => [
                'bank_name' => 'BDO Unibank',
                'account_name' => 'Life Generation Calapan Ministry',
                'account_number' => '0012 3456 7890',
                'instructions' => 'Deposit or Online Bank Transfer (InstaPay/PESONet). Upload a screenshot or clear photo of deposit slip.'
            ]
        ]);
    }

    /**
     * Submit a donation
     * POST /api/donations/submit
     */
    public function submit()
    {
        $user = get_auth_user();
        $input = api_input();

        $amount = (float) ($input['amount'] ?? 0);
        if ($amount <= 0) {
            api_response(['error' => 'A valid donation amount is required (greater than 0).'], 422);
        }

        $campaignId = !empty($input['campaign_id']) ? (int) $input['campaign_id'] : null;
        $category = trim($input['category'] ?? 'offering');
        $paymentMethod = trim($input['payment_method'] ?? 'gcash');
        $referenceNumber = trim($input['reference_number'] ?? '');
        $isAnonymous = !empty($input['is_anonymous']) ? 1 : 0;
        $donorMessage = trim($input['donor_message'] ?? '');

        // Determine donor details
        if ($isAnonymous) {
            $donorName = 'Anonymous Giver';
            $donorEmail = !empty($input['donor_email']) ? trim($input['donor_email']) : null;
            $donorPhone = !empty($input['donor_phone']) ? trim($input['donor_phone']) : null;
        } else {
            $donorName = !empty($input['donor_name']) 
                ? trim($input['donor_name']) 
                : ($user ? ($user['full_name'] ?? $user['username']) : 'Generous Giver');
            $donorEmail = !empty($input['donor_email']) 
                ? trim($input['donor_email']) 
                : ($user['email'] ?? null);
            $donorPhone = !empty($input['donor_phone']) ? trim($input['donor_phone']) : null;
        }

        // Handle proof receipt image upload if present
        $receiptPath = null;
        if (isset($_FILES['proof_receipt']) && $_FILES['proof_receipt']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['proof_receipt'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg');
            $allowed = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

            if (!in_array($ext, $allowed)) {
                api_response(['error' => 'Invalid receipt image format. Allowed: JPG, PNG, WEBP, PDF.'], 422);
            }

            if ($file['size'] > 15 * 1024 * 1024) {
                api_response(['error' => 'Receipt file size exceeds 15MB limit.'], 422);
            }

            $filename = 'receipt_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
            $publicDir = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public';
            $uploadDir = $publicDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'receipts' . DIRECTORY_SEPARATOR;

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            if (move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
                $receiptPath = 'uploads/receipts/' . $filename;
            }
        }

        // Generate unique tracking code
        $trackingCode = 'LG-' . strtoupper(bin2hex(random_bytes(4)));

        $userId = $user['id'] ?? null;

        $stmt = $this->db->raw(
            "INSERT INTO donations (
                tracking_code, user_id, campaign_id, donor_name, is_anonymous,
                donor_email, donor_phone, category, amount, payment_method,
                reference_number, proof_receipt, status, donor_message, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())",
            [
                $trackingCode,
                $userId,
                $campaignId,
                $donorName,
                $isAnonymous,
                $donorEmail,
                $donorPhone,
                $category,
                $amount,
                $paymentMethod,
                $referenceNumber,
                $receiptPath,
                $donorMessage ?: null
            ]
        );

        api_response([
            'success' => true,
            'message' => 'Thank you for your generous giving! Your donation has been recorded and will be verified shortly.',
            'tracking_code' => $trackingCode,
            'status' => 'pending',
            'amount' => $amount
        ], 201);
    }

    /**
     * Get member's personal donation history
     * GET /api/donations/my-history
     */
    public function my_history()
    {
        $user = require_auth_user();
        $userId = (int) $user['id'];
        $userEmail = $user['email'] ?? '';

        $stmt = $this->db->raw(
            "SELECT d.*, c.title AS campaign_title
             FROM donations d
             LEFT JOIN donation_campaigns c ON c.id = d.campaign_id
             WHERE d.user_id = ? OR (d.donor_email = ? AND d.donor_email IS NOT NULL AND d.donor_email != '')
             ORDER BY d.created_at DESC",
            [$userId, $userEmail]
        );

        $donations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($donations as &$d) {
            $d['amount'] = (float) $d['amount'];
        }

        api_response($donations);
    }

    /**
     * Staff/Admin list of all donations
     * GET /api/admin/donations
     */
    public function admin_index()
    {
        require_staff();

        $status = $_GET['status'] ?? null;
        $category = $_GET['category'] ?? null;
        $campaignId = !empty($_GET['campaign_id']) ? (int) $_GET['campaign_id'] : null;
        $search = trim($_GET['search'] ?? '');

        $sql = "SELECT d.*, 
                       c.title AS campaign_title,
                       u.username AS member_username,
                       m.full_name AS member_full_name,
                       m.member_id AS member_code,
                       v.full_name AS verifier_name
                FROM donations d
                LEFT JOIN donation_campaigns c ON c.id = d.campaign_id
                LEFT JOIN users u ON u.id = d.user_id
                LEFT JOIN members m ON m.user_id = d.user_id
                LEFT JOIN users v ON v.id = d.verified_by
                WHERE 1=1";
        
        $params = [];

        if (!empty($status) && in_array($status, ['pending', 'verified', 'rejected'])) {
            $sql .= " AND d.status = ?";
            $params[] = $status;
        }

        if (!empty($category)) {
            $sql .= " AND d.category = ?";
            $params[] = $category;
        }

        if (!empty($campaignId)) {
            $sql .= " AND d.campaign_id = ?";
            $params[] = $campaignId;
        }

        if (!empty($search)) {
            $sql .= " AND (d.donor_name LIKE ? OR d.tracking_code LIKE ? OR d.reference_number LIKE ? OR d.donor_email LIKE ?)";
            $term = "%{$search}%";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $sql .= " ORDER BY (d.status = 'pending') DESC, d.created_at DESC";

        $stmt = $this->db->raw($sql, $params);
        $donations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($donations as &$d) {
            $d['amount'] = (float) $d['amount'];
            $d['is_anonymous'] = (bool) $d['is_anonymous'];
        }

        api_response($donations);
    }

    /**
     * Verify or reject a donation
     * POST /api/admin/donations/verify
     */
    public function verify()
    {
        $staff = require_staff();
        $input = api_input();

        $id = (int) ($input['id'] ?? 0);
        $status = trim($input['status'] ?? '');
        $notes = trim($input['admin_notes'] ?? '');

        if ($id <= 0 || !in_array($status, ['verified', 'rejected', 'pending'])) {
            api_response(['error' => 'Valid donation ID and status (verified/rejected/pending) are required.'], 422);
        }

        // Fetch current donation
        $dStmt = $this->db->raw("SELECT * FROM donations WHERE id = ? LIMIT 1", [$id]);
        $donation = $dStmt->fetch(PDO::FETCH_ASSOC);
        if (!$donation) {
            api_response(['error' => 'Donation record not found.'], 404);
        }

        $this->db->raw(
            "UPDATE donations 
             SET status = ?, 
                 admin_notes = ?, 
                 verified_by = ?, 
                 verified_at = IF(? = 'verified', NOW(), NULL),
                 updated_at = NOW()
             WHERE id = ?",
            [
                $status,
                $notes ?: $donation['admin_notes'],
                $staff['id'],
                $status,
                $id
            ]
        );

        // If campaign attached, recalculate total collected for campaign
        if (!empty($donation['campaign_id'])) {
            $this->db->raw(
                "UPDATE donation_campaigns 
                 SET collected_amount = (
                     SELECT COALESCE(SUM(amount), 0) 
                     FROM donations 
                     WHERE campaign_id = ? AND status = 'verified'
                 )
                 WHERE id = ?",
                [$donation['campaign_id'], $donation['campaign_id']]
            );
        }

        api_response([
            'success' => true,
            'message' => "Donation status updated to {$status}."
        ]);
    }

    /**
     * Financial statistics & metrics for Admin / Officer dashboard
     * GET /api/admin/donations/stats
     */
    public function stats()
    {
        require_staff();

        // 1. Total verified sum
        $totStmt = $this->db->raw(
            "SELECT 
                COALESCE(SUM(CASE WHEN status = 'verified' THEN amount ELSE 0 END), 0) AS total_collected,
                COALESCE(SUM(CASE WHEN status = 'verified' AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN amount ELSE 0 END), 0) AS month_collected,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count,
                COUNT(CASE WHEN status = 'verified' THEN 1 END) AS verified_count,
                COUNT(DISTINCT CASE WHEN status = 'verified' THEN COALESCE(user_id, donor_email, donor_name) END) AS donor_count
             FROM donations"
        );
        $overview = $totStmt->fetch(PDO::FETCH_ASSOC);

        // 2. Breakdown by payment method
        $mStmt = $this->db->raw(
            "SELECT payment_method, 
                    COUNT(*) AS count, 
                    COALESCE(SUM(amount), 0) AS total 
             FROM donations 
             WHERE status = 'verified'
             GROUP BY payment_method"
        );
        $byMethod = $mStmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. Breakdown by category
        $cStmt = $this->db->raw(
            "SELECT category, 
                    COUNT(*) AS count, 
                    COALESCE(SUM(amount), 0) AS total 
             FROM donations 
             WHERE status = 'verified'
             GROUP BY category"
        );
        $byCategory = $cStmt->fetchAll(PDO::FETCH_ASSOC);

        // 4. Recent verified donations
        $rStmt = $this->db->raw(
            "SELECT d.id, d.tracking_code, d.donor_name, d.amount, d.category, d.payment_method, d.status, d.created_at
             FROM donations d
             ORDER BY d.created_at DESC
             LIMIT 5"
        );
        $recent = $rStmt->fetchAll(PDO::FETCH_ASSOC);

        api_response([
            'total_collected' => (float) ($overview['total_collected'] ?? 0),
            'month_collected' => (float) ($overview['month_collected'] ?? 0),
            'pending_count'   => (int) ($overview['pending_count'] ?? 0),
            'verified_count'  => (int) ($overview['verified_count'] ?? 0),
            'donor_count'     => (int) ($overview['donor_count'] ?? 0),
            'by_method'       => $byMethod,
            'by_category'     => $byCategory,
            'recent'          => $recent
        ]);
    }
}

