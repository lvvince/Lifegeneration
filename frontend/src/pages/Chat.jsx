import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  MessageSquare, Send, Image as ImageIcon, Smile, Pin, Trash2,
  Edit2, CornerUpLeft, Search, X, Check, CheckCheck, Loader2,
  Users, Megaphone, Sparkles, Heart, Lock, AlertCircle, ArrowLeft,
  ChevronDown, RefreshCw, ThumbsUp, Flame, ShieldAlert, AtSign
} from 'lucide-react'
import { apiGet, apiPost, getUser } from '../api.js'
import '../styles/pages.css'

// Quick reaction map
const REACTIONS = [
  { key: 'heart', label: 'Heart', icon: Heart, color: '#ef4444' },
  { key: 'pray', label: 'Pray / Amen', icon: Sparkles, color: '#f59e0b' },
  { key: 'thumbs_up', label: 'Thumbs Up', icon: ThumbsUp, color: '#3b82f6' },
  { key: 'praise', label: 'Praise', icon: Flame, color: '#ff5a0a' },
]

export default function Chat() {
  const currentUser = getUser()
  const [rooms, setRooms] = useState([])
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [messages, setMessages] = useState([])
  const [pinned, setPinned] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [membersList, setMembersList] = useState([])

  // UI States
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [inputText, setInputText] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)
  const pollTimerRef = useRef(null)

  const isStaff = currentUser && ['admin', 'officer', 'moderator'].includes(currentUser.role)

  // 1. Load Rooms & Member Directory on mount
  useEffect(() => {
    loadRooms(true)
    apiGet('/api/chat/members')
      .then(res => setMembersList(Array.isArray(res) ? res : []))
      .catch(() => {})

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])

  // 2. Poll messages & presence
  useEffect(() => {
    if (!activeRoomId) return
    loadMessages(activeRoomId, false)

    // Clear previous poll timer
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)

    // Short poll every 3 seconds for active, real-time feel
    pollTimerRef.current = setInterval(() => {
      loadMessages(activeRoomId, false)
      // Send heartbeat
      apiPost('/api/chat/presence/ping', {
        typing_room_id: activeRoomId,
        is_typing: false
      }).catch(() => {})
    }, 3000)

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [activeRoomId])

  // Scroll to bottom when messages update
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  const loadRooms = async (initial = false) => {
    try {
      if (initial) setLoadingRooms(true)
      const data = await apiGet('/api/chat/rooms')
      const roomList = Array.isArray(data) ? data : []
      setRooms(roomList)
      if (initial && roomList.length > 0 && !activeRoomId) {
        setActiveRoomId(roomList[0].id)
      }
    } catch (e) {
      console.error('Failed to load rooms:', e)
    } finally {
      if (initial) setLoadingRooms(false)
    }
  }

  const loadMessages = async (roomId, showLoader = true) => {
    try {
      if (showLoader) setLoadingMessages(true)
      const res = await apiGet(`/api/chat/rooms/${roomId}/messages`)
      if (res && res.messages) {
        setMessages(res.messages)
        setPinned(res.pinned || [])
        setTypingUsers(res.typing || [])
        if (showLoader) {
          setTimeout(() => scrollToBottom(false), 80)
        }
      }
    } catch (e) {
      console.error('Failed to load messages:', e)
    } finally {
      if (showLoader) setLoadingMessages(false)
    }
  }

  const activeRoom = useMemo(() => {
    return rooms.find(r => r.id === activeRoomId) || null
  }, [rooms, activeRoomId])

  // Image file select & preview
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Only JPG, PNG, and WEBP images are supported.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.')
      return
    }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const removeSelectedImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handle typing presence with debounce
  const handleInputChange = (e) => {
    const val = e.target.value
    setInputText(val)

    // Check for @mention trigger
    const words = val.split(' ')
    const lastWord = words[words.length - 1]
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      setShowMentionMenu(true)
      setMentionFilter(lastWord.slice(1).toLowerCase())
    } else {
      setShowMentionMenu(false)
    }

    // Ping typing status
    if (activeRoomId && val.length > 0) {
      apiPost('/api/chat/presence/ping', {
        typing_room_id: activeRoomId,
        is_typing: true
      }).catch(() => {})
    }
  }

  const insertMention = (username) => {
    const words = inputText.split(' ')
    words[words.length - 1] = `@${username} `
    setInputText(words.join(' '))
    setShowMentionMenu(false)
    inputRef.current?.focus()
  }

  // Send message
  const handleSend = async (e) => {
    e?.preventDefault()
    if (!inputText.trim() && !selectedImage) return
    if (!activeRoomId) return

    // Check announcement permission
    if (activeRoom?.type === 'announcement' && !isStaff) {
      alert('Only Pastors and Officers can post in the Announcements channel.')
      return
    }

    // Editing mode
    if (editingMsg) {
      try {
        setSending(true)
        await apiPost(`/api/chat/messages/${editingMsg.id}/edit`, {
          content: inputText.trim()
        })
        setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: inputText.trim(), is_edited: 1 } : m))
        setEditingMsg(null)
        setInputText('')
      } catch (err) {
        alert(err.message || 'Failed to edit message.')
      } finally {
        setSending(false)
      }
      return
    }

    // Send new message
    try {
      setSending(true)
      let payload
      if (selectedImage) {
        const formData = new FormData()
        formData.append('room_id', activeRoomId)
        formData.append('content', inputText.trim())
        if (replyingTo) formData.append('reply_to_id', replyingTo.id)
        formData.append('image', selectedImage)
        payload = formData
      } else {
        payload = {
          room_id: activeRoomId,
          content: inputText.trim(),
          reply_to_id: replyingTo ? replyingTo.id : null
        }
      }

      const res = await apiPost('/api/chat/messages', payload)
      if (res && res.data) {
        setMessages(prev => [...prev, res.data])
        setInputText('')
        removeSelectedImage()
        setReplyingTo(null)
        scrollToBottom(true)
        loadRooms(false) // update last message snippet in room list
      }
    } catch (err) {
      alert(err.message || 'Could not send message.')
    } finally {
      setSending(false)
    }
  }

  // Reactions
  const handleReact = async (messageId, reactionCode) => {
    try {
      await apiPost(`/api/chat/messages/${messageId}/react`, { reaction: reactionCode })
      // Refresh current messages
      loadMessages(activeRoomId, false)
    } catch (e) {
      console.error(e)
    }
  }

  // Pin message
  const handlePin = async (messageId) => {
    if (!isStaff) return
    try {
      await apiPost(`/api/chat/messages/${messageId}/pin`)
      loadMessages(activeRoomId, false)
    } catch (e) {
      alert(e.message || 'Pin action failed.')
    }
  }

  // Delete message
  const handleDelete = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    try {
      await apiPost(`/api/chat/messages/${messageId}/delete`)
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: 1, content: 'This message was deleted.', image_url: null } : m))
    } catch (e) {
      alert(e.message || 'Delete failed.')
    }
  }

  // Filtered messages by search
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter(m => (m.content || '').toLowerCase().includes(q) || (m.sender_name || '').toLowerCase().includes(q))
  }, [messages, searchQuery])

  // Filtered mentions list
  const filteredMentions = useMemo(() => {
    if (!mentionFilter) return membersList.slice(0, 5)
    return membersList.filter(m =>
      (m.username || '').toLowerCase().includes(mentionFilter) ||
      (m.full_name || '').toLowerCase().includes(mentionFilter)
    ).slice(0, 5)
  }, [membersList, mentionFilter])

  return (
    <div className="pg-root" style={{ padding: '16px 20px', maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Outer Card Container */}
      <div
        style={{
          height: 'calc(100vh - 120px)',
          minHeight: 580,
          background: '#fff',
          borderRadius: 20,
          border: '1px solid var(--p-border, #e5e8f1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        }}
      >

        {/* ─── LEFT: ROOM LIST ────────────────────────────────────────── */}
        <div
          style={{
            width: 320,
            borderRight: '1px solid var(--p-border, #e5e8f1)',
            display: 'flex',
            flexDirection: 'column',
            background: '#fafbfd',
            flexShrink: 0,
            ...(mobileShowChat ? { display: 'none' } : {})
          }}
          className="chat-room-sidebar"
        >
          {/* Header */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--p-border, #e5e8f1)', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,90,10,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <MessageSquare size={18} color="#ff5a0a" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1a1f2e' }}>
                  Fellowship Chat
                </h2>
                <span style={{ fontSize: 11.5, color: 'var(--p-text-2, #586079)' }}>
                  Channels &amp; Community
                </span>
              </div>
            </div>
          </div>

          {/* Room Items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
            {loadingRooms ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--p-text-2)' }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: 12, marginTop: 8 }}>Loading channels…</p>
              </div>
            ) : rooms.map(room => {
              const active = room.id === activeRoomId
              const isAnnouncement = room.type === 'announcement'
              return (
                <div
                  key={room.id}
                  onClick={() => {
                    setActiveRoomId(room.id)
                    setMobileShowChat(true)
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    marginBottom: 6,
                    cursor: 'pointer',
                    background: active ? '#fff' : 'transparent',
                    boxShadow: active ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
                    border: active ? '1.5px solid #ff5a0a' : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div
                        style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          background: isAnnouncement ? 'rgba(239,68,68,0.1)' : 'rgba(255,90,10,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {isAnnouncement ? <Megaphone size={14} color="#ef4444" /> : <Sparkles size={14} color="#ff5a0a" />}
                      </div>
                      <span style={{ fontWeight: active ? 800 : 700, fontSize: 13.5, color: '#1a1f2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {room.name}
                      </span>
                    </div>

                    {/* Unread badge */}
                    {parseInt(room.unread_count || 0) > 0 && (
                      <span
                        style={{
                          background: '#ff5a0a', color: '#fff', fontSize: 11,
                          fontWeight: 800, padding: '2px 7px', borderRadius: 999
                        }}
                      >
                        {room.unread_count}
                      </span>
                    )}
                  </div>

                  <p style={{ margin: 0, fontSize: 12, color: 'var(--p-text-2, #586079)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {room.last_message || (room.last_message_image ? '📷 Shared a photo' : room.description || 'Join the conversation…')}
                  </p>
                </div>
              )
            })}
          </div>

          {/* User Status Bar */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--p-border, #e5e8f1)', background: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#ff5a0a', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13
                }}
              >
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span
                style={{
                  width: 9, height: 9, borderRadius: '50%', background: '#22c55e',
                  border: '2px solid #fff', position: 'absolute', bottom: 0, right: 0
                }}
              />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1f2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.username || 'You'}
              </div>
              <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
                Online &bull; {currentUser?.role || 'member'}
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: CHAT ROOM MAIN PANE ─────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            minWidth: 0
          }}
        >
          {/* Header */}
          {activeRoom ? (
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--p-border, #e5e8f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setMobileShowChat(false)}
                  className="chat-back-mobile"
                  style={{
                    border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'none'
                  }}
                >
                  <ArrowLeft size={18} color="#1a1f2e" />
                </button>

                <div
                  style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: activeRoom.type === 'announcement' ? 'rgba(239,68,68,0.1)' : 'rgba(255,90,10,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}
                >
                  {activeRoom.type === 'announcement' ? <Megaphone size={18} color="#ef4444" /> : <Sparkles size={18} color="#ff5a0a" />}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1a1f2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeRoom.name}
                    </h3>
                    {activeRoom.type === 'announcement' && (
                      <span
                        style={{
                          fontSize: 10, fontWeight: 800, background: 'rgba(239,68,68,0.1)',
                          color: '#ef4444', padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase'
                        }}
                      >
                        Announcement Only
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--p-text-2, #586079)' }}>
                    {typingUsers.length > 0 ? (
                      <em style={{ color: '#ff5a0a' }}>
                        {typingUsers.map(u => u.username).join(', ')} typing…
                      </em>
                    ) : (
                      activeRoom.description || 'Active Fellowship Room'
                    )}
                  </span>
                </div>
              </div>

              {/* Header Right Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowSearch(!showSearch)}
                  style={{
                    border: '1px solid var(--p-border, #e5e8f1)',
                    background: showSearch ? 'rgba(255,90,10,0.08)' : '#fff',
                    borderRadius: 9, padding: '7px 10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
                    color: showSearch ? '#ff5a0a' : '#586079'
                  }}
                >
                  <Search size={14} />
                  <span className="hidden-mobile">Search</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 20 }}>Select a channel</div>
          )}

          {/* Search Bar Input (toggled) */}
          {showSearch && (
            <div style={{ padding: '10px 18px', background: '#f8fafc', borderBottom: '1px solid var(--p-border, #e5e8f1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={15} color="#586079" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search messages in this channel…"
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  outline: 'none', fontSize: 13, color: '#1a1f2e'
                }}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  <X size={14} color="#586079" />
                </button>
              )}
            </div>
          )}

          {/* Pinned Messages Header Tray */}
          {pinned.length > 0 && (
            <div
              style={{
                padding: '8px 18px',
                background: 'rgba(255,90,10,0.06)',
                borderBottom: '1px solid rgba(255,90,10,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12
              }}
            >
              <Pin size={13} color="#ff5a0a" />
              <strong style={{ color: '#ff5a0a', flexShrink: 0 }}>Pinned:</strong>
              <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a1f2e' }}>
                {pinned[0].content}
              </div>
              <span style={{ fontSize: 11, color: '#586079', flexShrink: 0 }}>
                by {pinned[0].sender_name}
              </span>
            </div>
          )}

          {/* ─── MESSAGE LIST SCROLLER ───────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            {loadingMessages ? (
              <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--p-text-2)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#ff5a0a' }} />
                <p style={{ fontSize: 13, marginTop: 8 }}>Loading fellowship messages…</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div style={{ textAlign: 'center', margin: 'auto', maxWidth: 320, color: 'var(--p-text-2)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,90,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <MessageSquare size={22} color="#ff5a0a" />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: '#1a1f2e' }}>
                  No messages yet
                </h4>
                <p style={{ margin: 0, fontSize: 13 }}>
                  Start the conversation! Share a prayer note, encouraging scripture, or say hi.
                </p>
              </div>
            ) : (
              filteredMessages.map(msg => {
                const isMine = currentUser && msg.sender_id === currentUser.id
                const isMsgStaff = ['admin', 'officer', 'moderator'].includes(msg.sender_role)

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: isMine ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      gap: 10,
                      position: 'relative'
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: isMine ? '#ff5a0a' : isMsgStaff ? '#6366f1' : '#e5e7eb',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 13, flexShrink: 0
                      }}
                    >
                      {msg.sender_avatar ? (
                        <img
                          src={msg.sender_avatar}
                          alt="avatar"
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        msg.sender_name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>

                    {/* Message Bubble + Actions Wrap */}
                    <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                      {/* Name & Role */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, fontSize: 11 }}>
                        <span style={{ fontWeight: 700, color: '#1a1f2e' }}>
                          {isMine ? 'You' : msg.sender_full_name || msg.sender_name}
                        </span>
                        {isMsgStaff && (
                          <span style={{ background: '#ede9fe', color: '#6366f1', padding: '1px 5px', borderRadius: 4, fontWeight: 800, fontSize: 9.5 }}>
                            {msg.sender_role.toUpperCase()}
                          </span>
                        )}
                        <span style={{ color: '#9ca3af' }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Replying Context Banner */}
                      {msg.reply_content && (
                        <div
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(0,0,0,0.04)',
                            borderLeft: '3px solid #ff5a0a',
                            borderRadius: 6,
                            fontSize: 11,
                            color: '#586079',
                            marginBottom: 4,
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <strong>{msg.reply_sender_name}:</strong> {msg.reply_content}
                        </div>
                      )}

                      {/* Message Body */}
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 16,
                          ...(isMine
                            ? { background: '#ff5a0a', color: '#fff', borderBottomRightRadius: 4 }
                            : { background: '#f1f3f7', color: '#1a1f2e', borderBottomLeftRadius: 4 }),
                          fontSize: 13.5,
                          lineHeight: 1.45,
                          wordBreak: 'break-word',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}
                      >
                        {msg.is_deleted ? (
                          <em style={{ opacity: 0.7 }}>This message was deleted.</em>
                        ) : (
                          <>
                            {msg.content}
                            {msg.is_edited ? (
                              <span style={{ fontSize: 10, opacity: 0.65, marginLeft: 6 }}>(edited)</span>
                            ) : null}
                          </>
                        )}

                        {/* Image Attachment */}
                        {msg.image_url && !msg.is_deleted && (
                          <div style={{ marginTop: 8 }}>
                            <img
                              src={msg.image_url}
                              alt="attached"
                              onClick={() => setLightboxImage(msg.image_url)}
                              style={{
                                maxWidth: '100%',
                                maxHeight: 240,
                                borderRadius: 10,
                                cursor: 'zoom-in',
                                display: 'block',
                                objectFit: 'cover'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Reaction Badges */}
                      {msg.grouped_reactions && msg.grouped_reactions.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {msg.grouped_reactions.map(gr => {
                            const foundReaction = REACTIONS.find(r => r.key === gr.reaction) || REACTIONS[0]
                            const IconComponent = foundReaction.icon
                            return (
                              <button
                                key={gr.reaction}
                                type="button"
                                onClick={() => handleReact(msg.id, gr.reaction)}
                                style={{
                                  border: gr.has_reacted ? '1.5px solid #ff5a0a' : '1px solid #e5e8f1',
                                  background: gr.has_reacted ? 'rgba(255,90,10,0.08)' : '#fff',
                                  borderRadius: 999,
                                  padding: '2px 7px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: gr.has_reacted ? '#ff5a0a' : '#586079'
                                }}
                              >
                                <IconComponent size={12} color={foundReaction.color} />
                                <span>{gr.count}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Hover / Actions Row */}
                      {!msg.is_deleted && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          {/* Quick Reactions */}
                          {REACTIONS.map(r => (
                            <button
                              key={r.key}
                              type="button"
                              onClick={() => handleReact(msg.id, r.key)}
                              title={r.label}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, opacity: 0.7 }}
                            >
                              <r.icon size={12} color={r.color} />
                            </button>
                          ))}

                          {/* Reply */}
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(msg)
                              inputRef.current?.focus()
                            }}
                            title="Reply"
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: '#586079' }}
                          >
                            <CornerUpLeft size={12} />
                          </button>

                          {/* Pin (Staff only) */}
                          {isStaff && (
                            <button
                              type="button"
                              onClick={() => handlePin(msg.id)}
                              title={msg.is_pinned ? 'Unpin message' : 'Pin message'}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: msg.is_pinned ? '#ff5a0a' : '#586079' }}
                            >
                              <Pin size={12} />
                            </button>
                          )}

                          {/* Edit / Delete (Owner or staff) */}
                          {isMine && !msg.image_url && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMsg(msg)
                                setInputText(msg.content)
                                inputRef.current?.focus()
                              }}
                              title="Edit message"
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: '#586079' }}
                            >
                              <Edit2 size={12} />
                            </button>
                          )}

                          {(isMine || isStaff) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(msg.id)}
                              title="Delete message"
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: '#ef4444' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Replying Context Bar */}
          {replyingTo && (
            <div style={{ padding: '8px 18px', background: '#f8fafc', borderTop: '1px solid var(--p-border, #e5e8f1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#586079' }}>
                <CornerUpLeft size={14} color="#ff5a0a" />
                <span>Replying to <strong>{replyingTo.sender_name}</strong>: <em>{replyingTo.content?.slice(0, 50)}</em></span>
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={14} color="#586079" />
              </button>
            </div>
          )}

          {/* Editing Context Bar */}
          {editingMsg && (
            <div style={{ padding: '8px 18px', background: '#fef3c7', borderTop: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#92400e' }}>
                <Edit2 size={14} />
                <span>Editing your message</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingMsg(null)
                  setInputText('')
                }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={14} color="#92400e" />
              </button>
            </div>
          )}

          {/* Image Preview Bar Before Sending */}
          {imagePreview && (
            <div style={{ padding: '10px 18px', background: '#f8fafc', borderTop: '1px solid var(--p-border, #e5e8f1)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', width: 56, height: 56, borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e8f1' }}>
                <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={removeSelectedImage}
                  style={{
                    position: 'absolute', top: 2, right: 2, width: 18, height: 18,
                    borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <X size={11} color="#fff" />
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#586079' }}>
                <div><strong>{selectedImage?.name}</strong></div>
                <div>{Math.round((selectedImage?.size || 0) / 1024)} KB &bull; Click send to attach</div>
              </div>
            </div>
          )}

          {/* Mention Autocomplete Popup */}
          {showMentionMenu && filteredMentions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: 74,
                left: 340,
                background: '#fff',
                border: '1px solid var(--p-border, #e5e8f1)',
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                padding: '6px 0',
                zIndex: 40,
                minWidth: 200
              }}
            >
              <div style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#ff5a0a', textTransform: 'uppercase' }}>
                Mention Member
              </div>
              {filteredMentions.map(m => (
                <div
                  key={m.id}
                  onClick={() => insertMention(m.username)}
                  style={{
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    hover: { background: '#f8fafc' }
                  }}
                >
                  <AtSign size={13} color="#586079" />
                  <span style={{ fontWeight: 700, color: '#1a1f2e' }}>{m.username}</span>
                  {m.full_name && <span style={{ fontSize: 11, color: '#586079' }}>({m.full_name})</span>}
                </div>
              ))}
            </div>
          )}

          {/* ─── CHAT INPUT ROW ─────────────────────────────────────── */}
          {activeRoom?.type === 'announcement' && !isStaff ? (
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--p-border, #e5e8f1)',
                background: '#f8fafc',
                textAlign: 'center',
                fontSize: 13,
                color: '#586079',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <Lock size={15} color="#ef4444" />
              <span>Only Pastors and Officers can post in the Church Announcements channel.</span>
            </div>
          ) : (
            <form
              onSubmit={handleSend}
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--p-border, #e5e8f1)',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              {/* Image upload trigger */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach photo (JPG, PNG, WEBP max 5MB)"
                style={{
                  border: '1px solid var(--p-border, #e5e8f1)',
                  background: '#fafbfd',
                  borderRadius: 10,
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <ImageIcon size={18} color="#586079" />
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={
                  editingMsg
                    ? 'Update your message…'
                    : `Message #${activeRoom?.name || 'chat'}… (@ to mention)`
                }
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1.5px solid var(--p-border, #e5e8f1)',
                  outline: 'none',
                  fontSize: 13.5,
                  color: '#1a1f2e',
                  background: '#fafbfd',
                  transition: 'border-color 0.15s'
                }}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={sending || (!inputText.trim() && !selectedImage)}
                style={{
                  border: 'none',
                  background: sending || (!inputText.trim() && !selectedImage) ? '#d1d5db' : '#ff5a0a',
                  color: '#fff',
                  borderRadius: 12,
                  padding: '10px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: sending || (!inputText.trim() && !selectedImage) ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.15s'
                }}
              >
                {sending ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <span>Send</span>
                    <Send size={14} />
                  </>
                )}
              </button>
            </form>
          )}

        </div>

      </div>

      {/* ─── LIGHTBOX MODAL FOR IMAGES ──────────────────────────────── */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'absolute', top: 20, right: 20,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={20} color="#fff" />
          </button>
          <img
            src={lightboxImage}
            alt="enlarged"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '92vw',
              maxHeight: '90vh',
              borderRadius: 14,
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              objectFit: 'contain'
            }}
          />
        </div>
      )}

      {/* Responsive Styles Helper */}
      <style>{`
        @media (max-width: 768px) {
          .chat-room-sidebar {
            width: 100% !important;
          }
          .chat-back-mobile {
            display: inline-flex !important;
          }
          .hidden-mobile {
            display: none !important;
          }
        }
      `}</style>

    </div>
  )
}
