<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/** @var object $router **/

$router->get('/', 'Welcome::index');
$router->get('/api', 'Home::index');

// 1. Authentication
$router->post('/api/auth/login',    'Auth::login');
$router->post('/api/login',         'Auth::login');
$router->post('/api/auth/register', 'Auth::register');
$router->post('/api/register',      'Auth::register');
$router->post('/api/auth/google',   'Auth::google');
$router->post('/api/google',        'Auth::google');
$router->get('/api/auth/me',        'Auth::me');
$router->get('/api/me',             'Auth::me');
$router->post('/api/auth/refresh',  'Auth::refresh');
$router->post('/api/auth/logout',   'Auth::logout');
$router->post('/api/logout',        'Auth::logout');

// 1b. Password reset
$router->post('/api/auth/forgot-password', 'PasswordReset::forgot');
$router->post('/api/auth/reset-password',  'PasswordReset::reset');

// 2. Discipleship Groups (D-Groups)
$router->get('/api/dgroups',                 'DGroups::index');
$router->post('/api/dgroups/join',           'DGroups::join');
$router->post('/api/dgroups/leave',          'DGroups::leave');
$router->post('/api/dgroups/request',        'DGroups::request_join');
$router->post('/api/dgroups/cancel-request', 'DGroups::cancel_request');
$router->get('/api/dgroups/requests',        'DGroups::requests');
$router->post('/api/dgroups/accept-request', 'DGroups::accept_request');
$router->post('/api/dgroups/reject-request', 'DGroups::reject_request');
$router->post('/api/dgroups/create',         'DGroups::create');
$router->post('/api/dgroups/update',         'DGroups::update');
$router->post('/api/dgroups/delete',         'DGroups::delete');
$router->post('/api/dgroups/upload-image',   'DGroups::upload_image');

// 3. Ministries & Volunteer Pipeline
$router->get('/api/ministries',                     'Ministries::index');
$router->post('/api/ministries/apply',              'Ministries::apply');
$router->post('/api/ministries/cancel',             'Ministries::cancel');
$router->get('/api/ministries/applications',        'Ministries::applications');
$router->post('/api/ministries/update-application', 'Ministries::update_application');
$router->post('/api/ministries/delete-application', 'Ministries::delete_application');
$router->post('/api/ministries/create',             'Ministries::create');
$router->post('/api/ministries/update',             'Ministries::update');
$router->post('/api/ministries/delete',             'Ministries::delete');
$router->post('/api/ministries/upload-image',       'Ministries::upload_image');

// 4. Events & QR Check-In
$router->get('/api/events',                 'Events::index');
$router->get('/api/events/{id}',            'Events::show');
$router->post('/api/events/rsvp',           'Events::rsvp');
$router->post('/api/events/cancel-rsvp',    'Events::cancel_rsvp');
$router->post('/api/events/check-in',       'Events::check_in');
$router->get('/api/events/{id}/attendees',  'Events::attendees');
$router->post('/api/events/create',         'Events::create');
$router->post('/api/events/update',         'Events::update');
$router->post('/api/events/delete',         'Events::delete');
$router->post('/api/events/upload-banner',  'Events::upload_banner');
$router->post('/api/events/upload',         'Events::upload_banner');

// 5. Prayer Wall
$router->get('/api/prayer',                 'Prayers::index');
$router->get('/api/prayers',                'Prayers::index');
$router->post('/api/prayer/submit',         'Prayers::submit');
$router->post('/api/prayers/submit',        'Prayers::submit');
$router->post('/api/prayer/mark-answered',  'Prayers::mark_answered');
$router->post('/api/prayer/delete',         'Prayers::delete');

// 6. Member Directory & Admin
$router->get('/api/members',        'Members::index');
$router->post('/api/members/update','Members::update');
$router->post('/api/members/upload-avatar', 'Members::upload_avatar');
$router->post('/api/members/remove-avatar', 'Members::remove_avatar');
$router->get('/api/admin/stats',    'Admin::stats');
$router->get('/api/stats',          'Admin::stats');
$router->get('/api/reports/summary', 'Reports::summary');

// 7. Announcements Bulletin
$router->get('/api/announcements',               'Announcements::index');
$router->get('/api/admin/announcements',         'Announcements::admin_index');
$router->post('/api/admin/announcements/create', 'Announcements::create');
$router->post('/api/admin/announcements/update', 'Announcements::update');
$router->post('/api/admin/announcements/delete', 'Announcements::delete');
$router->post('/api/admin/test-email', 'Admin::test_email');

// 8. Officer portal
$router->get('/api/officer/dashboard',             'Officer::dashboard');
$router->post('/api/officer/registrations/review', 'Officer::review_registration');


// 9. Donations & Giving
$router->get('/api/donations/campaigns',     'Donations::campaigns');
$router->get('/api/donations/payment-info',   'Donations::payment_info');
$router->post('/api/donations/submit',        'Donations::submit');
$router->get('/api/donations/my-history',     'Donations::my_history');
$router->get('/api/admin/donations',          'Donations::admin_index');
$router->get('/api/admin/donations/stats',    'Donations::stats');
$router->post('/api/admin/donations/verify',  'Donations::verify');


// 10. Daily Devotional & Verse of the Day
$router->get('/api/devotional/today',  'Devotionals::today');
$router->get('/api/devotional/random', 'Devotionals::random');
$router->get('/api/bible/lookup',      'Devotionals::lookup');
$router->get('/api/bible/search',      'Devotionals::lookup');
