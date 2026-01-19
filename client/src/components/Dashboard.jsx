import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import CryptoJS from 'crypto-js';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import { importKey, signMessage, verifyMessage } from '../utils/crypto';

const SECRET_KEY = "my-super-secret-demo-key";

const Dashboard = ({ user, onLogout }) => {
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

    // Update status when active contact changes & Auto-Connect
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
                if (peerRef.current && !conn) {
                    console.log(`Auto-connecting to ${activeContactId}...`);
                    setConnectionStatus('connecting');
                    const newConn = peerRef.current.connect(activeContactId);
                    setupConnection(newConn);
                }
            }
        };

        checkConnection();
        // Optional: Polling every few seconds to ensure connection?
        // For now, let's just do it on switch.
    }, [activeContactId]);

    // Initialize PeerJS
    // Initialize PeerJS
    useEffect(() => {
        let peer = null;
        let retryTimeout = null;

        const initializePeer = () => {
            peer = new Peer(user.peerId, {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            peer.on('open', (id) => {
                console.log('My Peer ID:', id);
            });

            peer.on('connection', (conn) => {
                console.log("Incoming connection from:", conn.peer);
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
                const handshake = JSON.stringify({ type: 'handshake', publicKey: user.publicKey });
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

    const handleIncomingMessage = async (senderId, payload) => {
        // 1. Check if it's a Handshake (JSON)
        try {
            if (typeof payload === 'string' && payload.startsWith('{')) {
                const data = JSON.parse(payload);
                if (data.type === 'handshake' && data.publicKey) {
                    console.log(`🔑 Handshake received from ${senderId}`);
                    const users = JSON.parse(localStorage.getItem('chat_users') || '{}');
                    if (!users[senderId]) {
                        users[senderId] = { username: senderId, peerId: senderId };
                    }
                    users[senderId].publicKey = data.publicKey;
                    localStorage.setItem('chat_users', JSON.stringify(users));
                    return;
                }
            }
        } catch (e) { /* Not a handshake */ }

        try {
            const bytes = CryptoJS.AES.decrypt(payload, SECRET_KEY);
            const originalString = bytes.toString(CryptoJS.enc.Utf8);

            if (originalString) {
                const { text, time, signature } = JSON.parse(originalString);

                let isVerified = false;
                const allUsers = JSON.parse(localStorage.getItem('chat_users') || '{}');
                const senderUser = Object.values(allUsers).find(u => u.peerId === senderId);

                if (senderUser && senderUser.publicKey && signature) {
                    try {
                        const publicKey = await importKey(senderUser.publicKey, "verify");
                        isVerified = await verifyMessage(publicKey, text + time, signature);
                        console.log(`✅ Signature Verified for ${senderId}`);
                    } catch (e) {
                        console.error("Verification failed", e);
                    }
                } else {
                    console.warn("Cannot verify: Missing public key or signature. Handshake might be needed.");
                }

                setChats(prev => {
                    const chatHistory = prev[senderId] || [];
                    return {
                        ...prev,
                        [senderId]: [...chatHistory, { sender: senderId, text, time, isVerified }]
                    };
                });

                updateContactLastMessage(senderId, text, time);

                setContacts(prev => {
                    if (!prev.find(c => c.id === senderId)) {
                        return [...prev, {
                            id: senderId,
                            name: senderUser ? senderUser.username : senderId.substring(0, 6),
                            lastMessage: text,
                            lastMessageTime: time
                        }];
                    }
                    return prev;
                });
            }
        } catch (err) {
            console.error("Decryption failed:", err);
        }
    };

    const updateContactLastMessage = (contactId, text, time) => {
        setContacts(prev => prev.map(c => {
            if (c.id === contactId) {
                return { ...c, lastMessage: text, lastMessageTime: time };
            }
            return c;
        }));
    };

    const handleSendMessage = async (text) => {
        if (!activeContactId) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let signature = null;
        if (myPrivateKey) {
            try {
                signature = await signMessage(myPrivateKey, text + time);
            } catch (e) {
                console.error("Signing failed", e);
            }
        }

        const newMsg = { sender: 'me', text, time, isVerified: true };
        setChats(prev => ({
            ...prev,
            [activeContactId]: [...(prev[activeContactId] || []), newMsg]
        }));

        updateContactLastMessage(activeContactId, text, time);

        let conn = connectionsRef.current[activeContactId];

        const sendData = (connection) => {
            const dataPacket = JSON.stringify({ text, time, signature });
            const ciphertext = CryptoJS.AES.encrypt(dataPacket, SECRET_KEY).toString();
            console.log("🔒 [DEMO] Sending Encrypted Payload:", ciphertext);
            connection.send(ciphertext);
        };

        if (conn && conn.open) {
            sendData(conn);
        } else {
            console.log(`Connecting to ${activeContactId}...`);
            setConnectionStatus('connecting');
            conn = peerRef.current.connect(activeContactId);
            setupConnection(conn);

            setTimeout(() => {
                if (!conn.open) {
                    console.warn("Connection timeout");
                }
            }, 5000);

            conn.on('open', () => {
                sendData(conn);
            });
        }
    };

    const handleAddContact = (contactId) => {
        setContacts(prev => [
            ...prev,
            { id: contactId, name: `User ${contactId.substring(0, 4)}`, lastMessage: '', lastMessageTime: '' }
        ]);
    };

    const activeMessages = activeContactId ? (chats[activeContactId] || []) : [];
    const activeContact = contacts.find(c => c.id === activeContactId);

    return (
    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            {/* Sidebar: Hidden on Mobile if chat is open, Always visible on Desktop */}
            <div className={`${activeContactId ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col h-full`}>
                <Sidebar
                    currentUser={user}
                    contacts={contacts}
                    activeContactId={activeContactId}
                    onSelectContact={setActiveContactId}
                    onAddContact={handleAddContact}
                    onLogout={onLogout}
                />
            </div>

            {/* ChatArea: Hidden on Mobile if no chat open, Always visible on Desktop */}
            <div className={`${!activeContactId ? 'hidden md:flex' : 'flex'} flex-1 h-full flex-col`}>
                <ChatArea
                    activeContact={activeContact}
                    messages={activeMessages}
                    onSendMessage={handleSendMessage}
                    myId={user.peerId}
                    connectionStatus={connectionStatus}
                    onBack={() => setActiveContactId(null)}
                />
            </div>
        </div>
    );
    );
};

export default Dashboard;
