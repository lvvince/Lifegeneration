<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Members extends Controller {
    public function __construct() {
        parent::__construct();
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: http://localhost:5173');
        $this->call->model('MemberModel');
    }

    public function index() {
        echo json_encode($this->MemberModel->all_with_users());
    }
}