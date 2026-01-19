import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import CryptoJS from 'crypto-js';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import { importKey, signMessage, verifyMessage } from '../utils/crypto';

const SECRET_KEY = "my-super-secret-demo-key";

const Dashboard = ({ user, onLogout }) => {
    const [contacts, setContacts] = useState(() => {
        // Lazy Init: Load from LS immediately to prevent overwriting with empty defaults
        const saved = localStorage.getItem(`chat_data_${user.username}`);
        return saved ? JSON.parse(saved).contacts || [] : [];
    });
    const [chats, setChats] = useState(() => {
        const saved = localStorage.getItem(`chat_data_${user.username}`);
        return saved ? JSON.parse(saved).chats || {} : {};
    });
    const [activeContactId, setActiveContactId] = useState(null);
    const [isPeerReady, setIsPeerReady] = useState(false);
    const [myPrivateKey, setMyPrivateKey] = useState(null);

    const peerRef = useRef(null);
    const connectionsRef = useRef({}); // Map: contactId -> DataConnection

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

    // Initialize PeerJS
    useEffect(() => {
        // For a real "Login", we want to use the user's specific PeerID.
        // However, PeerJS cloud doesn't allow claiming an ID if it's already taken by an active peer.
        // If the user refreshes, the old peer might still be "alive" for a few seconds on the server.
        // We will try to use the stored peerId.

        // Note: In production you'd want your own PeerServer to handle authentication/ownership of IDs.
        const peer = new Peer(user.peerId, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        peer.on('open', (id) => {
            console.log('My Peer ID:', id);
            setIsPeerReady(true);
        });

        peer.on('connection', (conn) => {
            console.log("Incoming connection from:", conn.peer);
            setupConnection(conn);
        });

        peer.on('error', (err) => {
            console.error("PeerJS Error:", err);
            if (err.type === 'peer-unavailable') {
                alert(`User ${err.message.replace('Could not connect to peer ', '')} is offline or does not exist.`);
            } else if (err.type === 'unavailable-id') {
                alert(`ID ${user.peerId} is taken. Try refreshing.`);
            } else if (err.type === 'network') {
                alert("Network Error: Could not connect to signaling server.");
            } else {
                alert(`Connection Error: ${err.message}`);
            }
        });

        peerRef.current = peer;

        return () => {
            peer.destroy();
            setIsPeerReady(false);
        };
    }, [user.peerId]);

    const setupConnection = (conn) => {
        connectionsRef.current[conn.peer] = conn;

        const sendHandshake = () => {
            if (user.publicKey) {
                console.log(`🤝 Sending Handshake to ${conn.peer}`);
                const handshake = JSON.stringify({ type: 'handshake', publicKey: user.publicKey });
                conn.send(handshake);
            }
        };

        if (conn.open) {
            sendHandshake();
        }

        conn.on('data', (payload) => {
            console.log("🔒 [DEMO] Received Payload:", payload);
            handleIncomingMessage(conn.peer, payload);
        });

        conn.on('open', () => {
            console.log(`Connection to ${conn.peer} opened (Event)`);
            sendHandshake();
        });

        conn.on('close', () => {
            console.log(`Connection to ${conn.peer} closed`);
            delete connectionsRef.current[conn.peer];
        });
    };

    const handleIncomingMessage = async (senderId, payload) => {
        // 1. Check if it's a Handshake (JSON)
        try {
            // If it's pure JSON starting with {, it might be unencrypted handshake
            if (typeof payload === 'string' && payload.startsWith('{')) {
                const data = JSON.parse(payload);
                if (data.type === 'handshake' && data.publicKey) {
                    console.log(`🔑 Handshake received from ${senderId}`);
                    // Store the key in memory or LS for this session
                    // Updating the global 'chat_users' is hacky but consistent with our "Distributed Directory" simulation
                    const users = JSON.parse(localStorage.getItem('chat_users') || '{}');
                    if (!users[senderId]) {
                        users[senderId] = { username: senderId, peerId: senderId }; // Create stub if missing
                    }
                    users[senderId].publicKey = data.publicKey;
                    localStorage.setItem('chat_users', JSON.stringify(users));
                    return; // Stop processing
                }
            }
        } catch (e) { /* Not a handshake, proceed to decryption */ }

        try {
            const bytes = CryptoJS.AES.decrypt(payload, SECRET_KEY);
            const originalString = bytes.toString(CryptoJS.enc.Utf8);

            if (originalString) {
                const { text, time, signature } = JSON.parse(originalString);

                // VERIFY SIGNATURE (Digital Signaling)
                let isVerified = false;
                // 1. Find sender's public key (Simulating PKI lookup)
                // Ideally we store peerId -> username mapping or search the 'directory' (chat_users)
                // This is slow O(N) but fine for demo.
                const allUsers = JSON.parse(localStorage.getItem('chat_users') || '{}');
                const senderUser = Object.values(allUsers).find(u => u.peerId === senderId);

                if (senderUser && senderUser.publicKey && signature) {
                    try {
                        const publicKey = await importKey(senderUser.publicKey, "verify");
                        // Verify the payload: text + time
                        isVerified = await verifyMessage(publicKey, text + time, signature);
                        console.log(`✅ Signature Verified for ${senderId}`);
                    } catch (e) {
                        console.error("Verification failed", e);
                    }
                } else {
                    console.warn("Cannot verify: Missing public key or signature. Handshake might be needed.");
                }


                // Add to chats
                setChats(prev => {
                    const chatHistory = prev[senderId] || [];
                    return {
                        ...prev,
                        [senderId]: [...chatHistory, { sender: senderId, text, time, isVerified }]
                    };
                });

                // Update last message in contacts
                updateContactLastMessage(senderId, text, time);

                // If sender is not in contacts, maybe add them?
                // For now, let's enforce adding contacts manually,
                // OR auto-add unknown senders as "Unknown"
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

        // SIGN MESSAGE
        let signature = null;
        if (myPrivateKey) {
            try {
                signature = await signMessage(myPrivateKey, text + time);
            } catch (e) {
                console.error("Signing failed", e);
            }
        }

        // Update local chat (we trust ourselves, so verified=true)
        setChats(prev => ({
            ...prev,
            [activeContactId]: [...(prev[activeContactId] || []), { sender: 'me', text, time, isVerified: true }]
        }));

        updateContactLastMessage(activeContactId, text, time);

        // Send to peer
        let conn = connectionsRef.current[activeContactId];

        const sendData = (connection) => {
            const dataPacket = JSON.stringify({ text, time, signature }); // Include Signature
            const ciphertext = CryptoJS.AES.encrypt(dataPacket, SECRET_KEY).toString();
            console.log("🔒 [DEMO] Sending Encrypted Payload:", ciphertext);
            connection.send(ciphertext);
        };

        if (conn && conn.open) {
            sendData(conn);
        } else {
            // Connect if not connected
            conn = peerRef.current.connect(activeContactId);
            setupConnection(conn);
            conn.on('open', () => {
                sendData(conn);
            });
        }
    };

    const handleAddContact = (contactId) => {
        // Allow adding name? For now just ID.
        setContacts(prev => [
            ...prev,
            { id: contactId, name: `User ${contactId.substring(0, 4)}`, lastMessage: '', lastMessageTime: '' }
        ]);
    };

    const activeMessages = activeContactId ? (chats[activeContactId] || []) : [];
    const activeContact = contacts.find(c => c.id === activeContactId);

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            <Sidebar
                currentUser={user}
                contacts={contacts}
                activeContactId={activeContactId}
                onSelectContact={setActiveContactId}
                onAddContact={handleAddContact}
                onLogout={onLogout}
            />
            <div className="flex-1 h-full">
                <ChatArea
                    activeContact={activeContact}
                    messages={activeMessages}
                    onSendMessage={handleSendMessage}
                    myId={user.peerId}
                />
            </div>
        </div>
    );
};

export default Dashboard;
