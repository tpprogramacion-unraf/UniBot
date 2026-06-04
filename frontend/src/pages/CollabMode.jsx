import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Send, Paperclip, Plus, UserPlus, FileText, FileQuestion } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function CollabMode() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [message, setMessage] = useState('')
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [viewResource, setViewResource] = useState(null) // { title, content, type }
  const [isViewing, setIsViewing] = useState(false)
  const messagesEndRef = useRef(null)

  // Fetch groups
  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get('/groups/')
      return res.data
    }
  })

  // Fetch messages for active group (polling)
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', activeGroupId],
    queryFn: async () => {
      const res = await api.get(`/messages/?group_id=${activeGroupId}`)
      return res.data
    },
    enabled: !!activeGroupId,
    refetchInterval: 3000 // Polling every 3s
  })

  // Fetch resources to attach
  const { data: summaries = [] } = useQuery({
    queryKey: ['my-summaries'],
    queryFn: async () => (await api.get('/summaries/')).data,
    enabled: showAttachMenu
  })
  const { data: exams = [] } = useQuery({
    queryKey: ['my-exams'],
    queryFn: async () => (await api.get('/exams/')).data,
    enabled: showAttachMenu
  })

  const sendMessageMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/messages/', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', activeGroupId])
      setMessage('')
      setShowAttachMenu(false)
    }
  })

  const createGroupMutation = useMutation({
    mutationFn: async (name) => {
      const res = await api.post('/groups/', { name })
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['groups'])
      setActiveGroupId(data.id)
    }
  })

  const addMemberMutation = useMutation({
    mutationFn: async ({ groupId, username }) => {
      const res = await api.post(`/groups/${groupId}/add_member/`, { username })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups'])
      alert('Miembro agregado')
    },
    onError: () => alert('Usuario no encontrado')
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!message.trim() || !activeGroupId) return
    sendMessageMutation.mutate({ group: activeGroupId, content: message })
  }

  const handleAttachResource = (type, resourceId, resourceTitle) => {
    const payload = {
      group: activeGroupId,
      content: `Compartió un recurso: ${resourceTitle}`,
      resource_type: type,
    }
    if (type === 'summary') payload.summary_id = resourceId
    if (type === 'simulation') payload.simulation_id = resourceId
    
    sendMessageMutation.mutate(payload)
  }

  const handleCreateGroup = () => {
    const name = prompt('Nombre del nuevo grupo:')
    if (name) createGroupMutation.mutate(name)
  }

  const handleAddMember = () => {
    const username = prompt('Nombre de usuario de tu amigo:')
    if (username) addMemberMutation.mutate({ groupId: activeGroupId, username })
  }

  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId) => {
      await api.post(`/groups/${groupId}/leave/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups'])
      setActiveGroupId(null)
    }
  })

  const handleLeaveGroup = () => {
    if (window.confirm('¿Seguro que querés abandonar este grupo?')) {
      leaveGroupMutation.mutate(activeGroupId)
    }
  }

  const handleViewResource = async (att) => {
    try {
      const res = await api.get(`/shared-resources/${att.id}/content/`)
      setViewResource(res.data)
      setIsViewing(true)
    } catch (err) {
      alert('No se pudo cargar el recurso.')
    }
  }

  const activeGroup = groups.find(g => g.id === activeGroupId)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      
      {/* Sidebar: Groups */}
      <div style={{ width: '300px', background: 'var(--glass-bg)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', borderRight: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Grupos de Estudio</h2>
          <button onClick={handleCreateGroup} style={{ background: 'var(--accent-gradient)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--glow-accent)' }}>
            <Plus size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map(g => (
            <div 
              key={g.id} 
              onClick={() => setActiveGroupId(g.id)}
              style={{ padding: '1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: activeGroupId === g.id ? 'var(--accent-dim)' : 'transparent', display: 'flex', alignItems: 'center', gap: '0.8rem', transition: 'all 0.15s' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <Users size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{g.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{g.members_count} miembros</div>
              </div>
            </div>
          ))}
          {groups.length === 0 && <p style={{ padding: '1rem', color: 'var(--text-3)', textAlign: 'center', fontSize: '0.85rem' }}>No estás en ningún grupo. ¡Creá uno para invitar amigos!</p>}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'transparent' }}>
        {activeGroup ? (
          <>
            {/* Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{activeGroup.name}</h2>
                <span style={{ fontSize: '0.72rem', background: 'var(--glass-bg-strong)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>{activeGroup.members_count} miembros</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleAddMember} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}>
                  <UserPlus size={16} /> Invitar
                </button>
                <button onClick={handleLeaveGroup} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.78rem', color: 'var(--red)' }}>
                  Salir
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map(msg => {
                const isMe = msg.sender_name === user?.username
                return (
                  <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', display: 'flex', flexDirection: 'column' }}>
                    {!isMe && <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: '0.5rem', marginBottom: '0.2rem', fontWeight: 500 }}>{msg.sender_name}</span>}
                    <div style={{ background: isMe ? 'var(--accent)' : 'var(--glass-bg-strong)', color: isMe ? '#fff' : 'var(--text)', padding: '0.8rem 1rem', borderRadius: 'var(--radius-sm)', borderBottomRightRadius: isMe ? '4px' : 'var(--radius-sm)', borderBottomLeftRadius: isMe ? 'var(--radius-sm)' : '4px', backdropFilter: isMe ? 'none' : 'blur(20px)', WebkitBackdropFilter: isMe ? 'none' : 'blur(20px)', border: isMe ? 'none' : '1px solid var(--border-glass)' }}>
                      <p style={{ margin: 0, wordBreak: 'break-word', fontSize: '0.88rem' }}>{msg.content}</p>
                      
                      {/* Attached resources */}
                      {msg.attachments && msg.attachments.map(att => (
                        <div 
                          key={att.id} 
                          onClick={() => handleViewResource(att)}
                          style={{ marginTop: '0.8rem', padding: '0.8rem', background: isMe ? 'rgba(255,255,255,0.12)' : 'var(--glass-bg)', borderRadius: 'var(--radius-xs)', display: 'flex', alignItems: 'center', gap: '0.8rem', border: isMe ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border)', cursor: 'pointer', transition: 'transform 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          {att.resource_type === 'summary' ? <FileText size={24} /> : <FileQuestion size={24} />}
                          <div>
                            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', opacity: 0.7, fontWeight: 600 }}>{att.resource_type}</div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{att.resource_title || 'Recurso Adjunto'}</div>
                          </div>
                        </div>
                      ))}

                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{ padding: '1rem', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)', position: 'relative' }}>
              
              {/* Attachment Menu Popup */}
              {showAttachMenu && (
                <div style={{ position: 'absolute', bottom: '100%', left: '1rem', marginBottom: '0.5rem', background: 'var(--glass-bg-strong)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--glass-shadow)', width: '300px', maxHeight: '300px', overflowY: 'auto', zIndex: 10 }}>
                  <div style={{ padding: '0.8rem', fontWeight: 600, borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>Mis Resúmenes</div>
                  {summaries.length === 0 && <div style={{ padding: '0.8rem', color: 'var(--text-3)', fontSize: '0.8rem' }}>No tenés resúmenes generados.</div>}
                  {summaries.map(s => (
                    <div key={s.id} onClick={() => handleAttachResource('summary', s.id, s.title)} style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.15s' }}>
                      <FileText size={16} color="var(--accent)" /> <span style={{ fontSize: '0.85rem' }}>{s.title}</span>
                    </div>
                  ))}
                  
                  <div style={{ padding: '0.8rem', fontWeight: 600, borderBottom: '1px solid var(--border)', borderTop: '3px solid var(--border)', fontSize: '0.82rem' }}>Mis Parciales</div>
                  {exams.length === 0 && <div style={{ padding: '0.8rem', color: 'var(--text-3)', fontSize: '0.8rem' }}>No tenés parciales simulados.</div>}
                  {exams.map(e => (
                    <div key={e.id} onClick={() => handleAttachResource('simulation', e.id, e.title)} style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.15s' }}>
                      <FileQuestion size={16} color="var(--accent)" /> <span style={{ fontSize: '0.85rem' }}>{e.title}</span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} style={{ background: 'var(--glass-bg-strong)', border: '1px solid var(--border)', padding: '0.8rem', borderRadius: '50%', cursor: 'pointer', color: 'var(--text-2)', transition: 'all 0.15s' }}>
                  <Paperclip size={20} />
                </button>
                <input 
                  type="text" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribí un mensaje..."
                  style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', outline: 'none', background: 'var(--bg-input)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}
                />
                <button type="submit" disabled={!message.trim() || sendMessageMutation.isPending} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.8rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-accent)', transition: 'all 0.15s' }}>
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
            <Users size={64} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 500 }}>Seleccioná un grupo de estudio</h2>
            <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>O creá uno nuevo para colaborar con tus amigos.</p>
          </div>
        )}
      </div>

      {/* Visor de Recursos Modal (Liquid Glass) */}
      {isViewing && viewResource && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setIsViewing(false)}>
          <div style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(60px) saturate(200%)', WebkitBackdropFilter: 'blur(60px) saturate(200%)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 40px 80px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.4)', borderRadius: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text)' }}>{viewResource.title}</h2>
              <button onClick={() => setIsViewing(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: '2rem', overflowY: 'auto', color: 'var(--text)' }}>
              {viewResource.type === 'summary' ? (
                <div className="prose" style={{ color: 'var(--text)', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {viewResource.content}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {viewResource.questions?.map((q, i) => (
                    <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ margin: '0 0 1rem 0', fontWeight: 600 }}>{i + 1}. {q.question}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {q.options.map((opt, j) => (
                          <div key={j} style={{ padding: '0.8rem', background: j === q.correct_option ? 'rgba(39, 201, 63, 0.2)' : 'rgba(255,255,255,0.05)', border: j === q.correct_option ? '1px solid rgba(39, 201, 63, 0.4)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: j === q.correct_option ? 'var(--accent)' : 'var(--text-2)' }}>
                            {opt} {j === q.correct_option && '✓ (Correcta)'}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
