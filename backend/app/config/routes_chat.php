<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/** @var object $router **/

// Fellowship Chat
$router->get('/api/chat/bootstrap',                 'Chat::bootstrap');
$router->get('/api/chat/channels/{id}/messages',    'Chat::messages');
$router->post('/api/chat/channels/{id}/messages',   'Chat::send');
$router->post('/api/chat/channels/{id}/read',       'Chat::mark_read');
$router->post('/api/chat/messages/{id}/edit',       'Chat::edit');
$router->post('/api/chat/messages/{id}/delete',     'Chat::delete');
$router->post('/api/chat/messages/{id}/pin',        'Chat::pin');
$router->post('/api/chat/messages/{id}/react',      'Chat::react');
$router->post('/api/chat/messages/{id}/ack',        'Chat::ack');
$router->get('/api/chat/messages/{id}/acks',        'Chat::ack_list');
$router->get('/api/chat/members',                   'Chat::members');
$router->get('/api/chat/profile/{id}',              'Chat::profile');
$router->get('/api/chat/activity',                  'Chat::activity');
$router->post('/api/chat/mute',                     'Chat::mute');

// Online sessions (Google Meet)
$router->get('/api/chat/sessions',                  'Chat::sessions');
$router->post('/api/chat/sessions',                 'Chat::create_session');
$router->post('/api/chat/sessions/{id}/rsvp',       'Chat::session_rsvp');
$router->post('/api/chat/sessions/{id}/join',       'Chat::session_join');
$router->post('/api/chat/sessions/{id}/cancel',     'Chat::session_cancel');
$router->post('/api/chat/sessions/{id}/notes',      'Chat::session_notes');
$router->get('/api/chat/sessions/{id}/people',      'Chat::session_people');

// Google Calendar / Meet connection
$router->get('/api/chat/google/status',             'Chat::google_status');
$router->get('/api/chat/google/connect',            'Chat::google_connect');
$router->get('/api/chat/google/callback',           'Chat::google_callback');
$router->post('/api/chat/google/disconnect',        'Chat::google_disconnect');
