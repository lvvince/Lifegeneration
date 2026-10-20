<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Events extends Controller {
    public function __construct() {
        parent::__construct();
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: http://localhost:5173');
        $this->call->database();
        $this->call->model('EventModel');
    }

    public function index() {
        echo json_encode($this->EventModel->all());
    }

    public function show($id) {
        $event = $this->EventModel->find((int) $id);
        if (!$event) {
            http_response_code(404);
            echo json_encode(['error' => 'Event not found.']);
            return;
        }
        echo json_encode($event);
    }
}