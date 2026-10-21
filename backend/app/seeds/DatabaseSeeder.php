<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class DatabaseSeeder {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
    }

    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        // Run UserSeeder
        require_once __DIR__ . '/UserSeeder.php';
        $userSeeder = new UserSeeder();
        $userSeeder->run();
    }
}
