import { useState } from 'react';

const Sidebar = ({ user, contacts, activeContactId, onSelectContact, onAddContact, onCreateGroup, onLogout, theme, toggleTheme }) => {
    const [newContactId, setNewContactId] = useState('');
    const [newContactName, setNewContactName] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    // Group Creation State
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

    const [addError, setAddError] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleAddContact = (e) => {
        e.preventDefault();
        if (!newContactId.trim() || !newContactName.trim()) {
            setAddError("ID and Nickname are required.");
            return;
        }

        let targetId = newContactId.trim();
        if (/^\d+$/.test(targetId)) {
            targetId = `phone-${targetId}`;
        }

        if (targetId === user.peerId) {
            setAddError("You cannot add yourself.");
            return;
        }

        if (contacts.find(c => c.id === targetId)) {
            setAddError("Contact already exists.");
            return;
        }

        onAddContact(targetId, newContactName.trim());
        setNewContactId('');
        setNewContactName('');
        setShowAddModal(false);
        setAddError('');
    };

    const handleCreateGroup = (e) => {
        e.preventDefault();
        if (!groupName.trim()) {
            setAddError("Group Name is required.");
            return;
        }
        if (selectedGroupMembers.length < 2) {
            setAddError("Select at least 2 members.");
            return;
        }

        onCreateGroup(groupName.trim(), selectedGroupMembers);
        setGroupName('');
        setSelectedGroupMembers([]);
        setShowGroupModal(false);
        setAddError('');
    };

    const toggleGroupMember = (contactId) => {
        setSelectedGroupMembers(prev =>
            prev.includes(contactId)
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        );
    };

    const isDark = theme === 'dark';

    return (
        <div className={`flex flex-col h-full transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-80'} ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-r border-gray-200'}`}>

            {/* User Profile Header */}
            <div className={`p-4 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between mb-3'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                            {user.username[0].toUpperCase()}
                        </div>
                        {!isCollapsed && <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>{user.displayName || user.username}</h3>}
                    </div>

                    {!isCollapsed && (
                        <div className="flex gap-2">
                            <button
                                onClick={toggleTheme}
                                className={`p-1.5 rounded transition ${isDark ? 'text-yellow-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-200'}`}
                                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {isDark ? '☀️' : '🌙'}
                            </button>
                            <button
                                onClick={onLogout}
                                className="text-gray-400 hover:text-red-500 transition p-1 rounded hover:bg-red-50"
                                title="Logout"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Collapsed Mode Actions */}
                {isCollapsed && (
                    <div className="flex flex-col gap-3 mt-4 items-center">
                        <button onClick={toggleTheme} title="Toggle Theme" className="text-xl">
                            {isDark ? '☀️' : '🌙'}
                        </button>
                        <button onClick={onLogout} title="Logout" className="text-gray-400 hover:text-red-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                )}

                {/* Sidebar Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`absolute top-1/2 -right-3 transform -translate-y-1/2 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md z-10 hover:bg-blue-600 md:flex hidden`}
                    style={{ top: '60px' }}
                >
                    {isCollapsed ? '>' : '<'}
                </button>

                {/* ID Card */}
                {!isCollapsed && (
                    <div className={`p-2 rounded border shadow-sm ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <p className={`text-[10px] uppercase font-bold mb-1 tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>My Connection ID</p>
                        <div className={`flex items-center justify-between gap-2 p-1.5 rounded cursor-pointer transition group ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}
                            onClick={() => {
                                navigator.clipboard.writeText(user.peerId);
                                alert("ID Copied to Clipboard!");
                            }}
                            title="Click to Copy"
                        >
                            <code className="text-xs text-blue-500 font-mono truncate select-all">{user.peerId}</code>
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {contacts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm mt-10">
                        {!isCollapsed && (
                            <>
                                <p className="mb-2">No contacts yet.</p>
                                <p>Click "+" to add a friend.</p>
                            </>
                        )}
                    </div>
                ) : (
                    contacts.map((contact) => (
                        <div
                            key={contact.id}
                            onClick={() => onSelectContact(contact.id)}
                            className={`p-4 flex items-center gap-3 cursor-pointer transition ${activeContactId === contact.id
                                ? (isDark ? 'bg-gray-800 border-r-4 border-blue-500' : 'bg-blue-50 border-r-4 border-blue-500')
                                : (isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-800')
                                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                            title={contact.name}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${contact.isGroup ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'}`}>
                                {contact.isGroup ? '👥' : (contact.name ? contact.name[0].toUpperCase() : '?')}
                            </div>

                            {!isCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className={`font-semibold truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                            {contact.name || contact.id || 'Unknown'}
                                        </h4>
                                        {contact.lastMessageTime && (
                                            <span className="text-[10px] text-gray-400">
                                                {contact.lastMessageTime}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">
                                        {contact.lastMessage || <span className="italic text-gray-400">No messages yet</span>}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Actions */}
            <div className={`p-4 border-t flex flex-col gap-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                    <span className="text-xl leading-none">+</span>
                    {!isCollapsed && "Add Contact"}
                </button>
                <button
                    onClick={() => {
                        // Filter out existing groups from the selection list logic
                        setShowGroupModal(true)
                    }}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                    <span className="text-xl leading-none">👥</span>
                    {!isCollapsed && "Create Group"}
                </button>
            </div>

            {/* Add Contact Modal */}
            {showAddModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`p-6 rounded-xl shadow-2xl w-80 animate-bounce-in ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
                        <h3 className="font-bold text-lg mb-4">Start New Chat</h3>
                        <form onSubmit={handleAddContact}>
                            <label className="text-xs font-semibold mb-1 block uppercase text-gray-500">Peer ID / Phone</label>
                            <input
                                className={`w-full border rounded px-3 py-2 mb-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                placeholder="Enter Connection ID"
                                value={newContactId}
                                onChange={(e) => setNewContactId(e.target.value)}
                                autoFocus
                            />

                            <label className="text-xs font-semibold mb-1 block uppercase text-gray-500">Nickname (Required)</label>
                            <input
                                className={`w-full border rounded px-3 py-2 mb-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                placeholder="E.g. John Doe"
                                value={newContactName}
                                onChange={(e) => setNewContactName(e.target.value)}
                            />

                            {addError && <p className="text-red-500 text-xs mb-3">{addError}</p>}

                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); setAddError(''); }}
                                    className={`px-3 py-1.5 text-sm rounded ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Add Friendly
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Group Modal */}
            {showGroupModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`p-6 rounded-xl shadow-2xl w-80 max-h-[90vh] flex flex-col animate-bounce-in ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
                        <h3 className="font-bold text-lg mb-4">Create New Group</h3>
                        <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col min-h-0">
                            <label className="text-xs font-semibold mb-1 block uppercase text-gray-500">Group Name</label>
                            <input
                                className={`w-full border rounded px-3 py-2 mb-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                placeholder="E.g. Project Build"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                autoFocus
                            />

                            <label className="text-xs font-semibold mb-2 block uppercase text-gray-500">Select Members</label>
                            <div className={`flex-1 overflow-y-auto mb-4 border rounded p-2 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                                {contacts.filter(c => !c.isGroup).length === 0 ? (
                                    <p className="text-center text-gray-400 text-xs py-4">No contacts available to add.</p>
                                ) : (
                                    contacts.filter(c => !c.isGroup).map(contact => (
                                        <div
                                            key={contact.id}
                                            onClick={() => toggleGroupMember(contact.id)}
                                            className={`flex items-center gap-2 p-2 rounded cursor-pointer mb-1 ${selectedGroupMembers.includes(contact.id)
                                                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                    : (isDark ? 'hover:bg-gray-600' : 'hover:bg-white')
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedGroupMembers.includes(contact.id) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-400'}`}>
                                                {selectedGroupMembers.includes(contact.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <span className="text-sm truncate font-medium">{contact.name || contact.id}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            {addError && <p className="text-red-500 text-xs mb-3">{addError}</p>}

                            <div className="flex gap-2 justify-end mt-auto">
                                <button
                                    type="button"
                                    onClick={() => { setShowGroupModal(false); setAddError(''); setSelectedGroupMembers([]); }}
                                    className={`px-3 py-1.5 text-sm rounded ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                    Create Group
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
