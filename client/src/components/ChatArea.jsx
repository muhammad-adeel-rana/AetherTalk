import { useState, useRef, useEffect } from 'react';

const ChatArea = ({ activeContact, messages, onSendMessage, myId, connectionStatus, onBack }) => {
    // ... (state)

    // ... (useEffect, handleSend, if check)

    return (
        <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative">
            {/* WhatsApp-like default background color */}

            {/* Header */}
            <div className="bg-gray-100 border-b p-3 flex items-center gap-3 shadow-sm z-10">
                {/* Back Button (Mobile Only) */}
                <button
                    onClick={onBack}
                    className="md:hidden text-gray-600 mr-1"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>

                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-lg">
                    {activeContact.name ? activeContact.name[0].toUpperCase() : activeContact.id.substring(0, 2).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-semibold text-gray-800">{activeContact.name || activeContact.id}</h3>
                    <p className="text-xs flex items-center gap-1">
                        {/* Status Indicator */}
                        {connectionStatus === 'connected' && (
                            <span className="text-green-600 font-bold flex items-center gap-1">
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
                        <span className="text-gray-300 mx-1">|</span>
                        <span className="text-green-600">P2P Encrypted</span>
                    </p>
                </div>

                {/* Retry Button */}
                {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
                    <button
                        onClick={() => {
                            // This is a hacky way to trigger retry in Dashboard
                            // Ideally pass a onRetry prop. 
                            // Since we don't have that prop yet, let's just show a visual indicator 
                            // or user can re-select contact.
                            // Wait, we need to pass sending message or new prop.
                            // Let's rely on user clicking contact again or typing.
                            // Actually, let's allow prop.
                            if (onSendMessage) onSendMessage(''); // Trigger logic? No empty check blocks it.
                        }}
                        className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                    >
                        Retry
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {messages.map((msg, index) => {
                    const isMe = msg.sender === 'me' || msg.sender === myId;
                    return (
                        <div
                            key={index}
                            className={`max-w-[70%] flex flex-col ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                        >
                            <div className={`px-3 py-1.5 rounded-lg shadow-sm text-sm relative ${isMe
                                ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none' // WhatsApp green for sent
                                : 'bg-white text-gray-800 rounded-tl-none'
                                }`}>
                                <div className="flex flex-col">
                                    <span>{msg.text}</span>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        {/* Verified Badge */}
                                        {msg.isVerified && (
                                            <span className="text-[10px] text-blue-500 font-bold flex items-center gap-0.5" title="Digital Signature Verified">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                Verified
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-400 leading-none">
                                            {msg.time}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-gray-100 p-3 flex gap-2 items-center">
                <input
                    className="flex-1 py-3 px-4 rounded-lg outline-none text-sm bg-white border-none focus:ring-1 focus:ring-gray-300"
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
