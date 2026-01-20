import { useState, useRef, useEffect } from 'react';

const ChatArea = ({ activeContact, messages, onSendMessage, onSendFile, onDeleteMessage, onClearChat, onRenameContact, myId, connectionStatus, onBack, theme }) => {
    const [input, setInput] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameInput, setRenameInput] = useState('');
    const fileInputRef = useRef(null);

    const messagesEndRef = useRef(null);
    // Track which message has the context menu open
    const [activeMessageMenu, setActiveMessageMenu] = useState(null);

    const isDark = theme === 'dark';

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Reset renaming state when contact changes
    useEffect(() => {
        setIsRenaming(false);
        setRenameInput('');
    }, [activeContact?.id]);

    useEffect(() => {
        // Close menu on click elsewhere
        const handleClick = () => setActiveMessageMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleSend = () => {
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };

    const handleSaveRename = () => {
        if (renameInput.trim()) {
            onRenameContact(renameInput.trim());
            setIsRenaming(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            onSendFile(file);
        }
        // Clear the input so the same file can be selected again
        e.target.value = null;
    };

    if (!activeContact) {
        return (
            <div className={`flex-1 flex items-center justify-center flex-col gap-4 ${isDark ? 'bg-gray-900 text-gray-500' : 'bg-gray-50 text-gray-300'}`}>
                <div className="text-6xl">💬</div>
                <p className="font-medium text-lg">Select a contact to start chatting</p>
            </div>
        )
    }

    return (
        <div className={`flex-1 flex flex-col h-full relative ${isDark ? 'bg-gray-900' : 'bg-[#efeae2]'}`}>

            {/* Header */}
            <div className={`border-b p-3 flex items-center gap-3 shadow-sm z-10 ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-200'}`}>
                {/* Back Button (Mobile Only) */}
                <button
                    onClick={onBack}
                    className={`md:hidden mr-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>

                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-lg">
                    {activeContact?.name ? activeContact.name[0].toUpperCase() : (activeContact?.id ? activeContact.id.substring(0, 2).toUpperCase() : '?')}
                </div>
                <div className="flex-1 min-w-0">
                    {isRenaming ? (
                        <div className="flex items-center gap-2">
                            <input
                                className={`px-2 py-1 rounded border text-sm w-full outline-none focus:ring-2 focus:ring-green-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`}
                                value={renameInput}
                                onChange={(e) => setRenameInput(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename();
                                    if (e.key === 'Escape') setIsRenaming(false);
                                }}
                            />
                            <button onClick={handleSaveRename} className="text-green-500 hover:text-green-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                            <button onClick={() => setIsRenaming(false)} className="text-red-500 hover:text-red-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{activeContact?.name || activeContact?.id || 'Unknown'}</h3>
                            <button
                                onClick={() => {
                                    setRenameInput(activeContact?.name || '');
                                    setIsRenaming(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-gray-500"
                                title="Rename Contact"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                        </div>
                    )}
                    <p className="text-xs flex items-center gap-1">
                        {/* Status Indicator */}
                        {connectionStatus === 'connected' && (
                            <span className="text-green-500 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                                Online
                            </span>
                        )}
                        {connectionStatus === 'connecting' && (
                            <span className="text-orange-500 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block animate-ping"></span>
                                Connecting...
                            </span>
                        )}
                        {connectionStatus === 'disconnected' && (
                            <span className="text-gray-400 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
                                Offline
                            </span>
                        )}
                        <span className="text-gray-500 mx-1">|</span>
                        <span className="text-green-600">P2P Encrypted</span>
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
                        <button
                            onClick={() => { if (onSendMessage) onSendMessage(''); }}
                            className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                        >
                            Retry
                        </button>
                    )}
                    <button
                        onClick={onClearChat}
                        className="text-gray-400 hover:text-red-500 p-2"
                        title="Clear Chat"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {messages.map((msg, index) => {
                    const isMe = msg.sender === 'me' || msg.sender === myId;
                    return (
                        <div
                            key={index}
                            className={`max-w-[70%] flex flex-col group ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                        >
                            <div
                                className={`px-3 py-1.5 rounded-lg shadow-sm text-sm relative group cursor-pointer ${msg.deleted
                                    ? 'bg-gray-200 text-gray-500 italic border border-gray-300'
                                    : (isMe
                                        ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none dark:bg-[#005c4b] dark:text-white'
                                        : 'bg-white text-gray-800 rounded-tl-none dark:bg-[#202c33] dark:text-white'
                                    )
                                    }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Toggle menu for this message
                                    setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id);
                                }}
                            >
                                <div className="flex flex-col">
                                    {/* Show sender name in group chats */}
                                    {!isMe && activeContact?.isGroup && msg.senderName && (
                                        <span className={`text-xs font-semibold mb-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                            {msg.senderName}
                                        </span>
                                    )}

                                    {msg.deleted ? (
                                        <span>🚫 {isMe ? "You deleted this message" : "This message was deleted"}</span>
                                    ) : (
                                        msg.isFile ? (
                                            <div className="flex flex-col gap-1">
                                                {msg.fileType?.startsWith('image/') && msg.fileUrl ? (
                                                    <img src={msg.fileUrl} alt={msg.text} className="max-w-full rounded-lg max-h-60 object-cover" />
                                                ) : (
                                                    <div className="flex items-center gap-2 p-2 bg-black/5 rounded">
                                                        <div className="bg-blue-500 text-white p-2 rounded">📄</div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="font-bold truncate max-w-[150px]">{msg.text}</span>
                                                            <span className="text-xs opacity-70">Variable Size</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {msg.fileUrl ? (
                                                    <a href={msg.fileUrl} download={msg.text} className="text-blue-500 hover:underline text-xs mt-1 block text-center" onClick={(e) => e.stopPropagation()}>
                                                        Download
                                                    </a>
                                                ) : (
                                                    <span className="text-xs opacity-50 italic">Uploading...</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span>{msg.text}</span>
                                        )
                                    )}

                                    {!msg.deleted && (
                                        <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                                            {msg.isVerified && (
                                                <span className="text-[10px] text-blue-500 font-bold flex items-center gap-0.5" title="Digital Signature Verified">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                </span>
                                            )}
                                            <span className="text-[10px] leading-none">
                                                {msg.time}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Context Menu */}
                                {activeMessageMenu === msg.id && !msg.deleted && (
                                    <div className={`absolute top-full mt-1 z-20 w-40 rounded shadow-lg py-1 text-sm ${isMe ? 'right-0' : 'left-0'} ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'}`}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteMessage(msg.id, false); // Delete for Me
                                                setActiveMessageMenu(null);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-black/10"
                                        >
                                            Delete for me
                                        </button>
                                        {isMe && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteMessage(msg.id, true); // Delete for Everyone
                                                    setActiveMessageMenu(null);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-black/10 text-red-500"
                                            >
                                                Delete for everyone
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`p-3 flex gap-2 items-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <input type="file" ref={fileInputRef} hidden onChange={handleFileSelect} />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-gray-600 transition"
                    title="Attach File"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                </button>

                <input
                    className={`flex-1 py-3 px-4 rounded-lg outline-none text-sm border-none focus:ring-1 focus:ring-gray-300 ${isDark ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-800'}`}
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                    onClick={handleSend}
                    className="bg-[#00a884] hover:bg-[#008f6f] text-white p-3 rounded-full transition shadow-sm flex items-center justify-center"
                >
                    <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24">
                        <path fill="currentColor" d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"></path>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ChatArea;
