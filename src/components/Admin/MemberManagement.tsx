import React from 'react';
import type { Member, UserRole } from '../../context/ExchangeContext';
import { validatePasswordStrength } from '../../utils/validation';
import * as bcrypt from 'bcryptjs';
import './Members.css';

// Shared styles (copied from Dashboard to avoid circular dependency)
const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    outline: 'none',
    fontSize: '14px',
    transition: 'all 0.3s'
};

const saveButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #D4A731, #8B6914)',
    color: '#0a0e1a',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    marginTop: '10px'
};

interface MemberManagementProps {
    localMembers: Member[];
    setLocalMembers: React.Dispatch<React.SetStateAction<Member[]>>;
    selectedMemberIds: Set<string>;
    memberSearch: string;
    setMemberSearch: (v: string) => void;
    memberRoleFilter: string;
    setMemberRoleFilter: (v: string) => void;
    handleBulkDelete: () => void;
    handleMemberChange: (index: number, field: string, value: string) => void;
    handleDeleteMember: (index: number) => void;
    handleSaveSettings: () => void;
    toggleSelectMember: (id: string) => void;
    handleSelectAll: (filtered: Member[]) => void;
    getRoleColor: (role: string) => { bg: string; text: string; border: string };
    getInitials: (name: string) => string;
    updateMemberPassword: (memberId: string, newPassword: string) => Promise<boolean>;
}

const AVATAR_COLORS = ['#D4AF37', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];
const getAvatarColor = (name: string) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const MemberManagement: React.FC<MemberManagementProps> = ({
    localMembers, setLocalMembers,
    selectedMemberIds,
    memberSearch, setMemberSearch,
    memberRoleFilter, setMemberRoleFilter,
    handleBulkDelete,
    handleMemberChange,
    handleDeleteMember,
    handleSaveSettings,
    toggleSelectMember,
    handleSelectAll,
    getRoleColor,
    getInitials,
    updateMemberPassword,
}) => {
    const activeCount = localMembers.filter(m => m.status === 'Aktif').length;
    const adminCount = localMembers.filter(m => m.role === 'Admin').length;
    const managerCount = localMembers.filter(m => m.role === 'Yönetici').length;

    const disabledStyle = { opacity: 0.5, cursor: 'not-allowed' as const };

    // Edit modal state
    const [editMemberId, setEditMemberId] = React.useState<string | null>(null);
    const [editName, setEditName] = React.useState('');
    const [editUsername, setEditUsername] = React.useState('');
    const [editShopName, setEditShopName] = React.useState('');
    const [editPwNew, setEditPwNew] = React.useState('');
    const [editPwConfirm, setEditPwConfirm] = React.useState('');
    const [editPwError, setEditPwError] = React.useState<string | null>(null);
    const [editPwSaving, setEditPwSaving] = React.useState(false);

    // Add modal state
    const [showAddModal, setShowAddModal] = React.useState(false);
    const [addName, setAddName] = React.useState('');
    const [addUsername, setAddUsername] = React.useState('');
    const [addShopName, setAddShopName] = React.useState('');
    const [addPassword, setAddPassword] = React.useState('');
    const [addRole, setAddRole] = React.useState('Üye');
    const [addError, setAddError] = React.useState<string | null>(null);
    const [addSaving, setAddSaving] = React.useState(false);

    // Role manager state
    const [showRoleManager, setShowRoleManager] = React.useState(false);

    const handleAddMemberClick = () => {
        setAddName(''); setAddUsername(''); setAddShopName('');
        setAddPassword(''); setAddRole('Üye'); setAddError(null);
        setShowAddModal(true);
    };

    return (
        <div className="members-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="page-header" style={{ marginBottom: 0, justifyContent: 'flex-end' }}>
                <div className="header-actions">
                    {selectedMemberIds.size > 0 && (
                        <button
                            className="btn btn-red"
                            onClick={handleBulkDelete}
                            style={{
                                background: 'rgba(239, 68, 68, 0.15)', color: '#F87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 16px',
                                borderRadius: '8px', fontWeight: 600, fontSize: '13px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            🗑 Seçilenleri Sil ({selectedMemberIds.size})
                        </button>
                    )}
                    <button className="btn btn-purple" onClick={() => setShowRoleManager(true)}>
                        <span style={{ fontSize: '16px' }}>🛡</span> Tüm Rolleri Yönet
                    </button>
                    <button className="btn btn-gold" onClick={handleAddMemberClick}>
                        <span style={{ fontSize: '16px' }}>＋</span> Yeni Kullanıcı Ekle
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-top">
                        <div className="stat-icon-wrap" style={{ background: 'rgba(212,175,55,0.1)' }}>👥</div>
                        <span className="stat-trend trend-up">Toplam</span>
                    </div>
                    <div className="stat-value" style={{ color: 'var(--gold)' }}>{localMembers.length}</div>
                    <div className="stat-label">Toplam Üye</div>
                    <div className="stat-bar"><div className="stat-bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg,#8a7020,#D4AF37)' }}></div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-top">
                        <div className="stat-icon-wrap" style={{ background: 'rgba(16,185,129,0.1)' }}>✅</div>
                        <span className="stat-trend trend-up">Aktif</span>
                    </div>
                    <div className="stat-value" style={{ color: 'var(--green)' }}>{activeCount}</div>
                    <div className="stat-label">Aktif Üye</div>
                    <div className="stat-bar"><div className="stat-bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg,#059669,#10b981)' }}></div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-top">
                        <div className="stat-icon-wrap" style={{ background: 'rgba(239,68,68,0.1)' }}>🛡</div>
                        <span className="stat-trend trend-neutral">Rol</span>
                    </div>
                    <div className="stat-value" style={{ color: 'var(--red)' }}>{adminCount}</div>
                    <div className="stat-label">Admin</div>
                    <div className="stat-bar"><div className="stat-bar-fill" style={{ width: '25%', background: 'linear-gradient(90deg,#991b1b,#ef4444)' }}></div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-top">
                        <div className="stat-icon-wrap" style={{ background: 'rgba(245,158,11,0.1)' }}>⚙️</div>
                        <span className="stat-trend trend-neutral">Rol</span>
                    </div>
                    <div className="stat-value" style={{ color: 'var(--amber)' }}>{managerCount}</div>
                    <div className="stat-label">Yönetici</div>
                    <div className="stat-bar"><div className="stat-bar-fill" style={{ width: '50%', background: 'linear-gradient(90deg,#92400e,#f59e0b)' }}></div></div>
                </div>
            </div>

            {/* Member Cards */}
            <div className="content-card">
                {/* Toolbar */}
                <div className="content-toolbar">
                    <div className="toolbar-left">
                        <div className="toolbar-title">Kullanıcı Listesi</div>
                        <div className="toolbar-sub">{localMembers.length} kayıt · {activeCount} aktif</div>
                    </div>
                    <div className="toolbar-right">
                        <div className="search-wrap">
                            <span className="search-icon">🔍</span>
                            <input
                                className="search-input" type="text"
                                placeholder="İsim veya kullanıcı adı ara..."
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                            />
                        </div>
                        <select className="filter-select" value={memberRoleFilter} onChange={(e) => setMemberRoleFilter(e.target.value)}>
                            <option value="">Tüm Roller</option>
                            <option value="Admin">Admin</option>
                            <option value="Yönetici">Yönetici</option>
                            <option value="Üye">Üye</option>
                        </select>
                    </div>
                </div>

                {/* Table Header */}
                <div className="table-head">
                    <div className="th" style={{ width: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                        <input
                            type="checkbox"
                            style={{ cursor: 'pointer', margin: 0, width: '12px', height: '12px' }}
                            checked={localMembers.length > 0 && selectedMemberIds.size === localMembers.filter(m => !(m.role === 'Admin' || m.username === 'admin')).length}
                            onChange={() => handleSelectAll(localMembers.filter(m => !(m.role === 'Admin' || m.username === 'admin')))}
                        />
                    </div>
                    <div className="th">ÜYE BİLGİSİ</div>
                    <div className="th">KULLANICI ADI</div>
                    <div className="th">ŞİFRE</div>
                    <div className="th">YETKİ / ROL</div>
                    <div className="th tc">DURUM</div>
                    <div className="th tc">İŞLEM</div>
                </div>

                {/* Member Rows */}
                <div>
                    {localMembers
                        .filter(member => {
                            const matchesSearch = member.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                                member.username.toLowerCase().includes(memberSearch.toLowerCase());
                            const matchesRole = memberRoleFilter === '' || member.role === memberRoleFilter;
                            return matchesSearch && matchesRole;
                        })
                        .sort((a, b) => {
                            const roleOrder = { 'Admin': 0, 'Yönetici': 1, 'Üye': 2 };
                            const roleA = roleOrder[a.role as keyof typeof roleOrder] ?? 99;
                            const roleB = roleOrder[b.role as keyof typeof roleOrder] ?? 99;
                            if (roleA !== roleB) return roleA - roleB;
                            return a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' });
                        })
                        .map((member) => {
                            const globalIndex = localMembers.findIndex(m => m.id === member.id);
                            const initials = getInitials(member.name);
                            const isPinned = member.role === 'Admin' || member.username === 'admin';
                            const rowStyle = isPinned ? disabledStyle : {};
                            let roleClass = 'rol-Üye';
                            if (member.role === 'Admin') roleClass = 'rol-Admin';
                            if (member.role === 'Yönetici') roleClass = 'rol-Yönetici';

                            return (
                                <div key={member.id} className={`member-row row-${member.role}`} style={{ animationDelay: `${globalIndex * 0.06}s` }}>
                                    <div className="td" style={{ width: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                                        <input type="checkbox" disabled={isPinned} checked={selectedMemberIds.has(member.id)}
                                            onChange={() => toggleSelectMember(member.id)}
                                            style={{ cursor: isPinned ? 'not-allowed' : 'pointer', accentColor: '#D4AF37', margin: 0, width: '12px', height: '12px' }}
                                        />
                                    </div>
                                    <div className="td">
                                        <div className="member-info" style={rowStyle}>
                                            <div className="member-avatar" style={{ background: getAvatarColor(member.name) }}>{initials}</div>
                                            <div style={{ width: '100%' }}>
                                                <div className="member-name-input" style={{ padding: '2px 0' }}>{member.name}</div>
                                                <div className="member-email">{member.username}@afsar.local</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="td">
                                        <div className="username-cell" style={rowStyle}>
                                            <span className="username-at">@</span>
                                            <div className="username-input" style={{ padding: '2px 0' }}>{member.username}</div>
                                        </div>
                                    </div>
                                    <div className="td">
                                        <div className="password-cell" style={{ ...rowStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="password-dots" style={{ fontSize: '13px', color: '#8B97B8', fontStyle: 'italic' }}>[GİZLİ]</span>
                                        </div>
                                    </div>
                                    <div className="td">
                                        <div className="rol-select-wrap">
                                            <select className={`rol-select ${roleClass}`} disabled={isPinned} value={member.role}
                                                onChange={(e) => handleMemberChange(globalIndex, 'role', e.target.value)}>
                                                {member.role === 'Admin' && <option value="Admin">🛡️ Admin</option>}
                                                <option value="Yönetici">⚙️ Yönetici</option>
                                                <option value="Üye">👤 Üye</option>
                                            </select>
                                            {!isPinned && <span className="rol-chevron">▾</span>}
                                        </div>
                                    </div>
                                    <div className="td tc">
                                        <div className="durum-wrap" style={{ justifyContent: 'center' }}>
                                            <div className={`toggle-track ${member.status === 'Aktif' ? 'on' : 'off'}`}
                                                onClick={() => { if (!isPinned) { const newVal = member.status === 'Aktif' ? 'Pasif' : 'Aktif'; handleMemberChange(globalIndex, 'status', newVal); } }}
                                                style={isPinned ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                                            >
                                                <div className="toggle-thumb"></div>
                                            </div>
                                            <span className={`durum-text ${member.status === 'Aktif' ? 'on' : 'off'}`}>
                                                {member.status === 'Aktif' ? 'Aktif' : 'Pasif'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="td tc">
                                        <div className="action-group">
                                            <button className="action-btn action-edit" title="Düzenle" disabled={isPinned}
                                                onClick={() => {
                                                    setEditMemberId(member.id);
                                                    setEditName(member.name);
                                                    setEditUsername(member.username);
                                                    setEditShopName(member.shopName || '');
                                                    setEditPwNew(''); setEditPwConfirm(''); setEditPwError(null);
                                                }}>✎</button>
                                            <button className="action-btn action-delete" title="Sil" disabled={isPinned}
                                                onClick={() => handleDeleteMember(globalIndex)}>✕</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>

                {/* Footer */}
                <div className="table-footer">
                    <div className="footer-info"><strong>{localMembers.length}</strong> üye kaydı · <strong>{activeCount}</strong> aktif</div>
                    <button className="save-btn" onClick={handleSaveSettings}>💾 Değişiklikleri Kaydet</button>
                </div>
            </div>

            {/* Member Edit Modal */}
            {editMemberId && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#141C32', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.3)', padding: '30px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ color: '#F5D56E', fontSize: '20px', margin: 0, fontWeight: 700 }}>✎ Üye Düzenle</h3>
                            <button onClick={() => setEditMemberId(null)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Ad Soyad</label>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ ...inputStyle, boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Kullanıcı Adı</label>
                                <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} style={{ ...inputStyle, boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Dükkan İsmi</label>
                                <input type="text" value={editShopName} onChange={e => setEditShopName(e.target.value)} style={{ ...inputStyle, boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }}></div>
                            <div style={{ fontSize: '13px', color: '#94a3b8' }}>Şifre Güncelle (Değiştirmek istemiyorsanız boş bırakın)</div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Yeni Şifre</label>
                                <input type="password" value={editPwNew} onChange={e => { setEditPwNew(e.target.value); setEditPwError(null); }} style={{ ...inputStyle, boxSizing: 'border-box' }} placeholder="••••••••" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Yeni Şifre (Tekrar)</label>
                                <input type="password" value={editPwConfirm} onChange={e => { setEditPwConfirm(e.target.value); setEditPwError(null); }} style={{ ...inputStyle, boxSizing: 'border-box' }} placeholder="••••••••" />
                            </div>
                            {editPwError && <div style={{ color: '#F87171', fontSize: '12px' }}>{editPwError}</div>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setEditMemberId(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#8B97B8', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>İptal</button>
                            <button disabled={editPwSaving}
                                onClick={async () => {
                                    if (editPwNew) {
                                        if (editPwNew.length < 3) { setEditPwError('Yeni şifre en az 3 karakter olmalı.'); return; }
                                        if (editPwNew !== editPwConfirm) { setEditPwError('Şifreler eşleşmiyor.'); return; }
                                    }
                                    setEditPwSaving(true);
                                    const index = localMembers.findIndex(m => m.id === editMemberId);
                                    if (index > -1) {
                                        const newMembers = [...localMembers];
                                        newMembers[index] = { ...newMembers[index], name: editName, username: editUsername, shopName: editShopName };
                                        setLocalMembers(newMembers);
                                    }
                                    if (editPwNew) {
                                        const ok = await updateMemberPassword(editMemberId!, editPwNew);
                                        if (!ok) { setEditPwError('Şifre güncellenirken hata oluştu.'); setEditPwSaving(false); return; }
                                    }
                                    setEditPwSaving(false);
                                    setEditMemberId(null);
                                }}
                                style={{ ...saveButtonStyle, marginTop: 0, padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', opacity: editPwSaving ? 0.6 : 1 }}
                            >💾 {editPwSaving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#141C32', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.3)', padding: '30px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ color: '#F5D56E', fontSize: '20px', margin: 0, fontWeight: 700 }}>➕ Yeni Üye Ekle</h3>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Ad Soyad</label>
                                <input type="text" value={addName} onChange={e => { setAddName(e.target.value); setAddError(null); }} style={{ ...inputStyle, boxSizing: 'border-box' }} placeholder="Kullanıcının tam adı" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Kullanıcı Adı</label>
                                <input type="text" value={addUsername} onChange={e => { setAddUsername(e.target.value); setAddError(null); }} style={{ ...inputStyle, boxSizing: 'border-box' }} placeholder="Örn: ahmet" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Dükkan İsmi</label>
                                <input type="text" value={addShopName} onChange={e => { setAddShopName(e.target.value); setAddError(null); }} style={{ ...inputStyle, boxSizing: 'border-box' }} placeholder="Örn: SADO SARRAFİYE" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Şifre</label>
                                <input type="password" value={addPassword} onChange={e => { setAddPassword(e.target.value); setAddError(null); }} style={{ ...inputStyle, boxSizing: 'border-box' }} placeholder="••••••••" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Rol</label>
                                <select value={addRole} onChange={e => setAddRole(e.target.value)} style={{ ...inputStyle, boxSizing: 'border-box' }}>
                                    <option value="Yönetici">⚙️ Yönetici</option>
                                    <option value="Üye">👤 Üye</option>
                                </select>
                            </div>
                            {addError && <div style={{ color: '#F87171', fontSize: '12px' }}>{addError}</div>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#8B97B8', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>İptal</button>
                            <button disabled={addSaving}
                                onClick={async () => {
                                    if (!addName.trim() || !addUsername.trim() || !addPassword.trim()) { setAddError('Tüm alanları doldurun.'); return; }
                                    const pwValidation = validatePasswordStrength(addPassword);
                                    if (!pwValidation.isValid) { setAddError(pwValidation.message); return; }
                                    setAddSaving(true);
                                    const hashedPw = await bcrypt.hash(addPassword, 10);
                                    const newId = crypto.randomUUID();
                                    const shopNameVal = addShopName.trim() || `${addName.trim().toUpperCase()} SARRAFİYE`;
                                    const newMember = { id: newId, name: addName.trim(), username: addUsername.trim(), shopName: shopNameVal, password: hashedPw, role: addRole as UserRole, status: 'Aktif' as const };
                                    const { supabase } = await import('../../supabaseClient');
                                    const { error: dbError } = await supabase.from('members').insert([{ id: newId, name: addName.trim(), username: addUsername.trim(), shop_name: shopNameVal, password: hashedPw, role: addRole, status: 'Aktif' }]);
                                    if (dbError) { setAddError('Kayıt hatası: ' + dbError.message); setAddSaving(false); return; }
                                    setLocalMembers([...localMembers, newMember]);
                                    setAddSaving(false);
                                    setShowAddModal(false);
                                }}
                                style={{ ...saveButtonStyle, marginTop: 0, padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', opacity: addSaving ? 0.6 : 1 }}
                            >➕ Ekle</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role Management Modal */}
            {showRoleManager && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#141C32', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.3)', padding: '30px', maxWidth: '700px', width: '90%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ color: '#F5D56E', fontSize: '20px', margin: 0, fontWeight: 700 }}>⚙️ Rol Yönetimi</h3>
                            <button onClick={() => setShowRoleManager(false)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {localMembers.map((member, index) => {
                                const isPinned = member.role === 'Admin' || member.username === 'admin';
                                const roleColor = getRoleColor(member.role);
                                return (
                                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', opacity: isPinned ? 0.5 : 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `linear-gradient(135deg, ${roleColor.bg}, ${roleColor.border})`, border: `1px solid ${roleColor.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: roleColor.text }}>{getInitials(member.name)}</div>
                                            <div>
                                                <div style={{ color: '#C8D4E8', fontWeight: 600, fontSize: '14px' }}>{member.name}</div>
                                                <div style={{ color: '#5A6480', fontSize: '12px' }}>@{member.username}</div>
                                            </div>
                                        </div>
                                        <select disabled={isPinned}
                                            style={{ padding: '8px 14px', background: roleColor.bg, border: `1px solid ${roleColor.border}`, borderRadius: '8px', color: roleColor.text, fontWeight: 700, fontSize: '13px', outline: 'none', cursor: isPinned ? 'not-allowed' : 'pointer' }}
                                            value={member.role}
                                            onChange={(e) => handleMemberChange(index, 'role', e.target.value)}>
                                            {member.role === 'Admin' && <option value="Admin" style={{ background: '#0a0e1a' }}>🛡️ Admin</option>}
                                            <option value="Yönetici" style={{ background: '#0a0e1a' }}>⚙️ Yönetici</option>
                                            <option value="Üye" style={{ background: '#0a0e1a' }}>👤 Üye</option>
                                        </select>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setShowRoleManager(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#8B97B8', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Kapat</button>
                            <button onClick={() => { handleSaveSettings(); setShowRoleManager(false); }} style={{ ...saveButtonStyle, marginTop: 0, padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>💾 Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemberManagement;
