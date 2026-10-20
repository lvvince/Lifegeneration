<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Admin extends Controller {
    public function __construct() {
        parent::__construct();
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: http://localhost:5173');
        $this->call->database();
        $this->call->model('MemberModel');
        $this->call->model('EventModel');
    }

    public function stats() {
        echo json_encode([
            'members' => $this->MemberModel->count_all(),
            'pending' => $this->MemberModel->count_pending(),
            'events'  => $this->EventModel->count_all(),
        ]);
    }
}