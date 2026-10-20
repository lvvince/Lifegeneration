<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Auth extends Controller
{
    public function __construct()
    {
        parent::__construct();
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: http://localhost:5173');
        $this->call->database();
    }

    private function json($data, $status = 200)
    {
        http_response_code($status);
        echo json_encode($data);
        exit;
    }

    public function login()
    {
        $identity = trim($this->io->post('identity') ?? $this->io->post('username') ?? '');
        $password = $this->io->post('password') ?? '';

        $fields = [];
        if ($identity === '') $fields['identity'] = 'Username or email is required.';
        if ($password === '') $fields['password'] = 'Password is required.';

        if ($fields) {
            $this->json(['error' => 'Punan ang lahat ng fields.', 'fields' => $fields], 422);
        }

        $stmt = $this->db->raw(
            'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1 LIMIT 1',
            [$identity, $identity]
        );
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        $hash = $user['password_hash'] ?? '';
        if (!$user || $hash === '' || !password_verify($password, $hash)) {
            $this->json(['error' => 'Mali ang username/email o password.'], 401);
        }

        unset($user['password_hash']);
        $this->json(['user' => $user]);
    }

    public function register()
    {
        $this->json(['error' => 'Not implemented yet.'], 501);
    }
}