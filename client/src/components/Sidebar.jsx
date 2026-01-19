import { useState } from 'react';

const Sidebar = ({ currentUser, contacts, activeContactId, onSelectContact, onAddContact, onLogout }) => {
    const [newContactId, setNewContactId] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [addError, setAddError] = useState('');

    const handleAddContact = (e) => {
        e.preventDefault();
        if (!newContactId.trim()) return;

        // Smart ID Handling: If user types just a number, assume it's a phone number and add prefix
        let targetId = newContactId.trim();
        if (/^\d+$/.test(targetId)) {
            targetId = `phone-${targetId}`;
        }

        // Check if adding self
        if (targetId === currentUser.peerId) {
            setAddError("You cannot add yourself.");
            return;
        }

        // Check if already exists
        if (contacts.find(c => c.id === targetId)) {
            setAddError("Contact already exists.");
            return;
        }

        onAddContact(targetId);
        setNewContactId('');
        setShowAddModal(false);
        setAddError('');
    };

    return (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
            {/* User Profile Header */}
            <div className="p-4 bg-gray-50 border-b">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            {currentUser.username[0].toUpperCase()}
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg">{currentUser.username}</h3>
                    </div>
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

                {/* ID Card */}
                <div className="bg-white p-2 rounded border border-gray-200 shadow-sm">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider">My Connection ID</p>
                    <div className="flex items-center justify-between gap-2 bg-gray-50 p-1.5 rounded cursor-pointer hover:bg-gray-100 transition group"
                        onClick={() => {
                            navigator.clipboard.writeText(currentUser.peerId);
                            alert("ID Copied to Clipboard!");
                        }}
                        title="Click to Copy"
                    >
                        <code className="text-xs text-blue-600 font-mono truncate select-all">{currentUser.peerId}</code>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto">
                {contacts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm mt-10">
                        <p className="mb-2">No contacts yet.</p>
                        <p>Click "+" to add a friend by their ID.</p>
                    </div>
                ) : (
                    contacts.map((contact) => (
                        <div
                            key={contact.id}
                            onClick={() => onSelectContact(contact.id)}
                            className={`p-4 flex items-center gap-3 cursor-pointer transition hover:bg-gray-50 ${activeContactId === contact.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                                }`}
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                {/* Use name if available, else first 2 chars of ID */}
                                {contact?.name ? contact.name[0].toUpperCase() : (contact?.id ? contact.id.substring(0, 2).toUpperCase() : '?')}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="font-semibold text-gray-800 truncate">
                                        {contact?.name || contact?.id || 'Unknown'}
                                    </h4>
                                    {contact.lastMessageTime && (
                                        <span className="text-[10px] text-gray-400">
                                            {contact.lastMessageTime}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 truncate">
                                    {contact.lastMessage || <span className="italic text-gray-300">No messages yet</span>}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Contact Button (Floating or Bottom) */}
            <div className="p-4 border-t">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                    <span>+</span> Add New Chat
                </button>
            </div>

            {/* Add Contact Modal */}
            {showAddModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-80 animate-bounce-in">
                        <h3 className="font-bold text-lg mb-4 text-gray-800">Start New Chat</h3>
                        <form onSubmit={handleAddContact}>
                            <input
                                className="w-full border rounded px-3 py-2 mb-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Enter Friend's Phone Number"
                                value={newContactId}
                                onChange={(e) => setNewContactId(e.target.value)}
                                autoFocus
                            />
                            <input
                                className="w-full border rounded px-3 py-2 mb-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Friend's Name (Optional)"
                                name="contactName" // Not implemented in state just for logic simplicity for now, can rely on ID
                            />

                            {addError && <p className="text-red-500 text-xs mb-3">{addError}</p>}

                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); setAddError(''); }}
                                    className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Add
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
