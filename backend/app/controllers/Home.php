<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Home extends Controller {
    public function __construct() {
        parent::__construct();
        header('Content-Type: application/json');
    }

    public function index() {
        echo json_encode(['app' => 'LGY API', 'status' => 'ok']);
    }
}