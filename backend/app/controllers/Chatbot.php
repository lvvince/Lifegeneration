<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Chatbot Controller
 * ------------------
 * Handles chatbot FAQ API endpoints for the Life Generation Youth app.
 *
 * Routes:
 *   GET  /api/chatbot/ask?q=your+question   → search and return best matching answer
 *   GET  /api/chatbot/faqs                  → return all FAQs (optional ?category=)
 *   GET  /api/chatbot/categories            → return all FAQ categories
 */
class Chatbot extends Controller {

    public function __construct()
    {
        parent::__construct();
        $this->call->model('Chatbot_faq', 'chatbot_faq');

        // Set JSON response headers
        header('Content-Type: application/json; charset=utf-8');
    }

    // ── GET /api/chatbot/ask?q=... ────────────────────────────────────────────

    public function ask()
    {
        $q = trim($_GET['q'] ?? '');

        if (empty($q)) {
            return $this->respond([
                'status'  => 'error',
                'message' => 'Please provide a question using the ?q= parameter.',
            ], 400);
        }

        $faq = $this->chatbot_faq->search($q);

        if ($faq) {
            return $this->respond([
                'status'   => 'success',
                'matched'  => true,
                'category' => $faq->category,
                'question' => $faq->question,
                'answer'   => $faq->answer,
            ]);
        }

        return $this->respond([
            'status'  => 'success',
            'matched' => false,
            'answer'  => 'Sorry, I don\'t have an answer for that yet. Please contact our church staff for more information.',
        ]);
    }

    // ── GET /api/chatbot/faqs?category=... ───────────────────────────────────

    public function faqs()
    {
        $category = $_GET['category'] ?? null;
        $data     = $this->chatbot_faq->get_all($category ? trim($category) : null);

        return $this->respond([
            'status' => 'success',
            'count'  => count($data),
            'data'   => $data,
        ]);
    }

    // ── GET /api/chatbot/categories ───────────────────────────────────────────

    public function categories()
    {
        $data = $this->chatbot_faq->get_categories();
        $list = array_column((array) $data, 'category');

        return $this->respond([
            'status' => 'success',
            'data'   => $list,
        ]);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function respond(array $data, int $status = 200): void
    {
        http_response_code($status);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
}
?>
