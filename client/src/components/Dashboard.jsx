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
    const [connectionStatus, setConnectionStatus] = useState('disconnected');

    const peerRef = useRef(null);
    const connectionsRef = useRef({}); // Map: contactId -> DataConnection

    // Update status when active contact changes
    useEffect(() => {
        if (!activeContactId) {
            setConnectionStatus('disconnected');
            return;
        }
        const conn = connectionsRef.current[activeContactId];
        if (conn && conn.open) {
            setConnectionStatus('connected');
        } else {
            setConnectionStatus('disconnected');
        }
    }, [activeContactId]);

    // ... (Loading keys etc)

    // ... (Peer Setup)

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

    // ... (Handle Incoming)

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

        // Update local chat
        const newMsg = { sender: 'me', text, time, isVerified: true };
        setChats(prev => ({
            ...prev,
            [activeContactId]: [...(prev[activeContactId] || []), newMsg]
        }));

        updateContactLastMessage(activeContactId, text, time);

        // Send to peer
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
            // Connect if not connected
            console.log(`Connecting to ${activeContactId}...`);
            setConnectionStatus('connecting');
            conn = peerRef.current.connect(activeContactId);
            setupConnection(conn);

            // Add a timeout alert if it takes too long
            setTimeout(() => {
                if (!conn.open) {
                    console.warn("Connection timeout");
                    // We don't force status change here to avoid flickering if it's just slow, 
                    // but commonly 5s is enough to know if it failed silently.
                }
            }, 5000);

            conn.on('open', () => {
                sendData(conn);
            });
        }
    };

    const handleAddContact = (contactId) => {
        // ...
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
                    connectionStatus={connectionStatus} // Pass status
                />
            </div>
        </div>
    );
};

export default Dashboard;
