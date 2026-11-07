<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Welcome extends Controller {
	public function index() {
		$root = dirname(__DIR__, 2);
		$docroot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/');

		// mga posibleng lokasyon ng frontend build
		$candidates = array_filter([
			$docroot ? $docroot . '/index.html' : null,
			$docroot ? $docroot . '/dist/index.html' : null,
			$root . '/public/index.html',
			$root . '/dist/index.html',
			$root . '/frontend/dist/index.html',
			$root . '/build/index.html',
		]);

		foreach ($candidates as $file) {
			if (is_file($file)) {
				header('Content-Type: text/html; charset=utf-8');
				header('Cache-Control: no-store');
				readfile($file);
				exit;
			}
		}

		// fallback kung walang nakitang index.html
		header('Location: /login', true, 302);
		exit;
	}
}