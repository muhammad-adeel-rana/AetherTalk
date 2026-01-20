import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import CryptoJS from 'crypto-js';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import { importKey, signMessage, verifyMessage } from '../utils/crypto';

const SECRET_KEY = "my-super-secret-demo-key";

const Dashboard = ({ user, onLogout, theme, toggleTheme }) => {
    const [contacts, setContacts] = useState(() => {
        const saved = localStorage.getItem(`chat_data_${user.username}`);
        return saved ? JSON.parse(saved).contacts || [] : [];
    });
    const [chats, setChats] = useState(() => {
        const saved = localStorage.getItem(`chat_data_${user.username}`);
        return saved ? JSON.parse(saved).chats || {} : {};
    });
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [myPrivateKey, setMyPrivateKey] = useState(null);

    const peerRef = useRef(null);
    const connectionsRef = useRef({}); // Map: contactId -> DataConnection
    // Used to track active contact ID for status updates
    const [activeContactId, setActiveContactId] = useState(null);

    // Load Private Key on mount
    useEffect(() => {
        const loadKey = async () => {
            const keyJwkStr = localStorage.getItem(`private_key_${user.username}`);
            if (keyJwkStr) {
                try {
                    const key = await importKey(JSON.parse(keyJwkStr), "sign");
                    setMyPrivateKey(key);
                    console.log("Private Key Loaded");
                } catch (e) {
                    console.error("Failed to load private key", e);
                }
            }
        };
        loadKey();
    }, [user.username]);

    // Save Data to LocalStorage on change
    useEffect(() => {
        if (user.username) {
            const data = { contacts, chats };
            localStorage.setItem(`chat_data_${user.username}`, JSON.stringify(data));
        }
    }, [contacts, chats, user.username]);

    // Update status when active contact changes & Auto-Connect & Polling
    useEffect(() => {
        if (!activeContactId) {
            setConnectionStatus('disconnected');
            return;
        }

        const checkConnection = () => {
            const conn = connectionsRef.current[activeContactId];
            if (conn && conn.open) {
                setConnectionStatus('connected');
            } else {
                setConnectionStatus('disconnected');
                // Auto-Connect attempt if we are PeerReady
                if (peerRef.current && peerRef.current.id && !conn) {
                    console.log(`Auto-connecting to ${activeContactId}...`);
                    setConnectionStatus('connecting');
                    const newConn = peerRef.current.connect(activeContactId);
                    setupConnection(newConn);
                }
            }
        };

        checkConnection();

        // Polling to retry connection if peer comes online later
        const interval = setInterval(() => {
            const conn = connectionsRef.current[activeContactId];
            if (!conn || !conn.open) {
                console.log(`Polling: Retrying connection to ${activeContactId}...`);
                checkConnection();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [activeContactId]);

    // Initialize PeerJS
    useEffect(() => {
        let peer = null;
        let retryTimeout = null;

        const initializePeer = () => {
            peer = new Peer(user.peerId, {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        // OpenRelay Free TURN Server (Metered.ca)
                        // This helps traverse Symmetric NATs (Mobile Data)
                        {
                            urls: 'turn:openrelay.metered.ca:80',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        },
                        {
                            urls: 'turn:openrelay.metered.ca:443',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        },
                        {
                            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        }
                    ]
                }
            });

            peer.on('open', (id) => {
                console.log('My Peer ID:', id);
            });

            peer.on('connection', (conn) => {
                console.log("Incoming connection from:", conn.peer);

                const existing = connectionsRef.current[conn.peer];
                if (existing) {
                    if (existing.open) {
                        console.log(`Already connected to ${conn.peer}, keeping EXISTING (Open). Closing Incoming.`);
                        conn.close();
                        return;
                    }
                    // If existing is not open (pending), we let them race.
                    // We simply accept this new incoming connection as well.
                    // The first one to 'open' will update the UI and become active.
                    console.log(`Connection Race: Accepting incoming from ${conn.peer} to race with pending outgoing.`);
                }
                setupConnection(conn);
            });

            peer.on('error', (err) => {
                console.error("PeerJS Error:", err);
                if (err.type === 'peer-unavailable') {
                    // This error is about the *target* peer, not us.
                    // We handle this in the connection logic usually, but good to know.
                } else if (err.type === 'unavailable-id') {
                    console.warn(`ID ${user.peerId} is taken. Retrying in 2s...`);
                    // Retry initialization
                    if (retryTimeout) clearTimeout(retryTimeout);
                    retryTimeout = setTimeout(() => {
                        console.log("Retrying Peer Init...");
                        initializePeer();
                    }, 2000);
                } else if (err.type === 'network') {
                    console.error("Network Error - Signaling Server Unreachable");
                }
            });

            peerRef.current = peer;
        };

        initializePeer();

        return () => {
            if (retryTimeout) clearTimeout(retryTimeout);
            if (peer) peer.destroy();
        };
    }, [user.peerId]);

    const setupConnection = (conn) => {
        connectionsRef.current[conn.peer] = conn;

        // Update status if this connection is for the active contact
        if (conn.peer === activeContactId) {
            setConnectionStatus('connecting');
        }

        const sendHandshake = () => {
            if (user.publicKey) {
                console.log(`🤝 Sending Handshake to ${conn.peer}`);
                // Include Username in Handshake
                const handshake = JSON.stringify({
                    type: 'handshake',
                    publicKey: user.publicKey,
                    username: user.username,
                    displayName: user.displayName || user.username // Send Display Name
                });
                conn.send(handshake);
            }
        };

        if (conn.open) {
            if (conn.peer === activeContactId) setConnectionStatus('connected');
            sendHandshake();
        }

        conn.on('data', (payload) => {
            console.log("🔒 [DEMO] Received Payload:", payload);
            handleIncomingMessage(conn.peer, payload);
        });

        conn.on('open', () => {
            console.log(`Connection to ${conn.peer} opened (Event)`);
            // RACE WINNER: Make sure this successful connection is the one we use
            connectionsRef.current[conn.peer] = conn;

            if (conn.peer === activeContactId) setConnectionStatus('connected');
            sendHandshake();
        });

        conn.on('close', () => {
            console.log(`Connection to ${conn.peer} closed`);
            if (conn.peer === activeContactId) setConnectionStatus('disconnected');
            delete connectionsRef.current[conn.peer];
        });

        conn.on('error', (err) => {
            console.error("Connection Error:", err);
            if (conn.peer === activeContactId) setConnectionStatus('error');
        });
    };

    // FEATURE: FILE SHARING (Chunking)
    const fileChunksRef = useRef({}); // Stores partial file chunks: { fileId: { metadata, chunks: [], count } }

    const handleSendFile = async (file) => {
        if (!activeContactId) return;

        const fileId = crypto.randomUUID();
        const chunkSize = 16 * 1024; // 16KB chunks
        const totalChunks = Math.ceil(file.size / chunkSize);

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // 1. Send Metadata Packet
        const metaPacket = {
            type: 'file-start',
            fileId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            totalChunks,
            timestamp
        };

        let conn = connectionsRef.current[activeContactId];
        if (!conn || !conn.open) return; // Should handle reconnect logic properly in real app

        conn.send(JSON.stringify(metaPacket));

        // Add "Sending..." local message
        const localMsg = {
            id: fileId,
            sender: 'me',
            text: `📂 Sending ${file.name}...`,
            fileUrl: null, // Placeholder
            time: timestamp,
            isVerified: true
        };
        setChats(prev => ({ ...prev, [activeContactId]: [...(prev[activeContactId] || []), localMsg] }));


        // 2. Read & Send Chunks
        const reader = new FileReader();
        let offset = 0;
        let chunkIndex = 0;

        // Recursive reader function to prevent UI freeze
        const readNextChunk = () => {
            if (offset < file.size) {
                const slice = file.slice(offset, offset + chunkSize);
                reader.readAsArrayBuffer(slice);
            } else {
                // Done Reading
                conn.send(JSON.stringify({ type: 'file-end', fileId }));
                console.log("File Sent Complete");
            }
        };

        reader.onload = (e) => {
            const buffer = e.target.result;
            // Convert ArrayBuffer to Base64 to send via PeerJS (JSON safe)
            // Ideally we send binary, but PeerJS JSON serialization is safer for now
            const wordArray = CryptoJS.lib.WordArray.create(buffer);
            const base64 = CryptoJS.enc.Base64.stringify(wordArray);

            conn.send(JSON.stringify({
                type: 'file-chunk',
                fileId,
                chunkIndex,
                data: base64
            }));

            offset += chunkSize;
            chunkIndex++;

            // Allow UI to breathe
            setTimeout(readNextChunk, 5);
        };

        readNextChunk();
    };

    // Update Incoming Logic
    const handleIncomingMessage = async (senderId, payload) => {
        // ... (Handshake Logic - kept same)
        try {
            if (typeof payload === 'string' && payload.startsWith('{')) {
                const data = JSON.parse(payload);
                if (data.type === 'handshake') { /* ... existing handshake logic ... */
                    // Kept existing logic inside original file
                }

                // FILE HANDLING
                if (data.type === 'file-start') {
                    console.log(`📂 Receiving file ${data.fileName} from ${senderId}`);
                    fileChunksRef.current[data.fileId] = {
                        chunks: [],
                        metadata: data,
                        receivedCount: 0
                    };
                    return;
                }

                if (data.type === 'file-chunk') {
                    const transfer = fileChunksRef.current[data.fileId];
                    if (transfer) {
                        transfer.chunks[data.chunkIndex] = data.data; // Store base64
                        transfer.receivedCount++;
                    }
                    return;
                }

                if (data.type === 'file-end') {
                    const transfer = fileChunksRef.current[data.fileId];
                    if (transfer) {
                        console.log("📂 File Receive Complete, assembling...");
                        // Reassemble Base64 -> Blob
                        // Sort just in case order messed up (PeerJS is ordered though)
                        const orderedChunks = transfer.chunks;

                        // Convert Base64 array back to Blobs
                        const blobParts = orderedChunks.map(b64 => {
                            const byteCharacters = atob(b64);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            return new Uint8Array(byteNumbers);
                        });

                        const blob = new Blob(blobParts, { type: transfer.metadata.fileType });
                        const url = URL.createObjectURL(blob);

                        // Add Message
                        setChats(prev => ({
                            ...prev,
                            [senderId]: [...(prev[senderId] || []), {
                                id: transfer.metadata.fileId,
                                sender: senderId,
                                text: transfer.metadata.fileName,
                                isFile: true,
                                fileUrl: url,
                                fileType: transfer.metadata.fileType,
                                time: transfer.metadata.timestamp
                            }]
                        }));

                        updateContactLastMessage(senderId, `📎 ${transfer.metadata.fileName}`, transfer.metadata.timestamp);
                        delete fileChunksRef.current[data.fileId];
                    }
                    return;
                }
            }
        } catch (e) { }

        // ... keys decryption logic ...
    };

    try {
        const bytes = CryptoJS.AES.decrypt(payload, SECRET_KEY);
        const originalString = bytes.toString(CryptoJS.enc.Utf8);

        if (originalString) {
            const parsed = JSON.parse(originalString);

            // Handle deletion
            if (parsed.type === 'delete') {
                setChats(prev => ({
                    ...prev,
                    [senderId]: (prev[senderId] || []).map(msg =>
                        msg.id === parsed.targetId
                            ? { ...msg, deleted: true, text: '' } // Clear text for security
                            : msg
                    )
                }));
                // Also update last msg if it was deleted
                setContacts(prev => prev.map(c => {
                    if (c.id === senderId && c.lastMessageId === parsed.targetId) {
                        return { ...c, lastMessage: '🚫 This message was deleted' };
                    }
                    return c;
                }));
                return;
            }

            // Normal Message
            const { id, text, time, signature } = parsed;

            let isVerified = false;
            const allUsers = JSON.parse(localStorage.getItem('chat_users') || '{}');
            const senderUser = Object.values(allUsers).find(u => u.peerId === senderId);

            if (senderUser && senderUser.publicKey && signature) {
                try {
                    const publicKey = await importKey(senderUser.publicKey, "verify");
                    // Verify signature of ID + Text + Time
                    isVerified = await verifyMessage(publicKey, id + text + time, signature);
                    console.log(`✅ Signature Verified for ${senderId}`);
                } catch (e) {
                    console.error("Verification failed", e);
                }
            } else {
                console.warn("Cannot verify: Missing public key or signature. Handshake might be needed.");
            }

            setChats(prev => {
                const chatHistory = prev[senderId] || [];
                // Dedup check (just in case)
                if (chatHistory.find(m => m.id === id)) return prev;

                return {
                    ...prev,
                    [senderId]: [...chatHistory, { id, sender: senderId, text, time, isVerified }]
                };
            });

            updateContactLastMessage(senderId, text, time, id);

            setContacts(prev => {
                if (!prev.find(c => c.id === senderId)) {
                    return [...prev, {
                        id: senderId,
                        name: senderUser ? senderUser.username : senderId.substring(0, 6),
                        lastMessage: text,
                        lastMessageTime: time,
                        lastMessageId: id
                    }];
                }
                return prev;
            });
        }
    } catch (err) {
        console.error("Decryption failed:", err);
    }
};

const updateContactLastMessage = (contactId, text, time, msgId) => {
    setContacts(prev => prev.map(c => {
        if (c.id === contactId) {
            return {
                ...c,
                lastMessage: text,
                lastMessageTime: time,
                lastMessageId: msgId
            };
        }
        return c;
    }));
};

const handleSendMessage = async (text) => {
    if (!activeContactId) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const id = crypto.randomUUID();

    let signature = null;
    if (myPrivateKey) {
        try {
            // Sign ID as well to prevent replay/tampering
            signature = await signMessage(myPrivateKey, id + text + time);
        } catch (e) {
            console.error("Signing failed", e);
        }
    }

    const newMsg = { id, sender: 'me', text, time, isVerified: true };
    setChats(prev => ({
        ...prev,
        [activeContactId]: [...(prev[activeContactId] || []), newMsg]
    }));

    updateContactLastMessage(activeContactId, text, time, id);

    // Send over wire
    // ... (connection logic reuse)
    let conn = connectionsRef.current[activeContactId];

    const sendData = (connection) => {
        const dataPacket = JSON.stringify({ type: 'msg', id, text, time, signature });
        const ciphertext = CryptoJS.AES.encrypt(dataPacket, SECRET_KEY).toString();
        console.log("🔒 [DEMO] Sending Encrypted Payload:", ciphertext);
        connection.send(ciphertext);
    };

    if (conn && conn.open) {
        sendData(conn);
    } else {
        // ... existing connect logic ...
        // Simplified for brevity in this replace block, essentially same as before but using sendData
        console.log(`Connecting to ${activeContactId}...`);
        setConnectionStatus('connecting');
        conn = peerRef.current.connect(activeContactId);
        setupConnection(conn);

        // Wait briefly for open
        conn.on('open', () => sendData(conn));
    }
};

// New Feature: Delete Message
const handleDeleteMessage = (msgId, forEveryone) => {
    if (!activeContactId) return;

    // 1. Delete locally
    setChats(prev => ({
        ...prev,
        [activeContactId]: (prev[activeContactId] || []).map(msg =>
            msg.id === msgId ? { ...msg, deleted: true, text: '' } : msg
        )
    }));

    // 2. Send delete signal if forEveryone
    if (forEveryone) {
        const conn = connectionsRef.current[activeContactId];
        if (conn && conn.open) {
            const dataPacket = JSON.stringify({ type: 'delete', targetId: msgId });
            const ciphertext = CryptoJS.AES.encrypt(dataPacket, SECRET_KEY).toString();
            conn.send(ciphertext);
        }
    }
};

// New Feature: Clear/Delete Contact
const handleClearChat = (contactId) => {
    if (confirm("Are you sure you want to delete this contact and all messages?")) {
        // Remove messages
        setChats(prev => {
            const newChats = { ...prev };
            delete newChats[contactId];
            return newChats;
        });
        // Remove contact
        setContacts(prev => prev.filter(c => c.id !== contactId));

        // Go back
        setActiveContactId(null);
    }
};

// New Feature: Rename Contact Locally
const handleRenameContact = (contactId, newName) => {
    if (!newName.trim()) return;
    setContacts(prev => prev.map(c => {
        if (c.id === contactId) {
            return { ...c, name: newName.trim() };
        }
        return c;
    }));
};

const handleAddContact = (contactId, contactName) => {
    setContacts(prev => [
        ...prev,
        {
            id: contactId,
            name: contactName || `User ${contactId.substring(0, 4)}`,
            lastMessage: '',
            lastMessageTime: ''
        }
    ]);
};

const activeMessages = activeContactId ? (chats[activeContactId] || []) : [];
const activeContact = contacts.find(c => c.id === activeContactId) || (activeContactId ? { id: activeContactId } : null);

return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
        {/* Sidebar: Hidden on Mobile if chat is open, Always visible on Desktop */}
        <div className={`${activeContactId ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col h-full border-r ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <Sidebar
                user={user}
                contacts={contacts}
                activeContactId={activeContactId}
                onSelectContact={setActiveContactId}
                onAddContact={handleAddContact}
                onLogout={onLogout}
                theme={theme}
                toggleTheme={toggleTheme}
            />
        </div>

        {/* ChatArea: Hidden on Mobile if no chat open, Always visible on Desktop */}
        <div className={`${!activeContactId ? 'hidden md:flex' : 'flex'} flex-1 h-full flex-col`}>
            <ChatArea
                activeContact={activeContact}
                messages={activeMessages}
                onSendMessage={handleSendMessage}
                onSendFile={handleSendFile}
                onDeleteMessage={handleDeleteMessage}
                onClearChat={() => handleClearChat(activeContactId)}
                myId={user.peerId}
                connectionStatus={connectionStatus}
                onBack={() => setActiveContactId(null)}
                theme={theme}
            />
        </div>
    </div>
);
};

export default Dashboard;
