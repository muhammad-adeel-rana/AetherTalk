import { useState } from 'react';
import { generateKeyPair, exportKey } from '../utils/crypto';

const AuthPage = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Allow only numbers
    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        setPhone(value);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');

        if (!phone.trim() || !password.trim()) {
            setError("Please fill in all fields.");
            return;
        }

        // PAKISTANI NUMBER VALIDATION
        // Accepts: 03001234567 or 923001234567
        // Regex: Starts with 03 or 923, followed by 9 digits.
        const pakPhoneRegex = /^(03|923)\d{9}$/;

        if (!pakPhoneRegex.test(phone)) {
            setError("Invalid Number. Must be a Pakistani mobile number (e.g., 03001234567).");
            return;
        }

        const users = JSON.parse(localStorage.getItem('chat_users') || '{}');

        if (isLogin) {
            // LOGIN
            if (users[phone] && users[phone].password === password) {
                onLogin(users[phone]);
            } else {
                setError("Invalid phone number or password.");
            }
        } else {
            // SIGNUP
            if (users[phone]) {
                setError("Account already exists for this number.");
                return;
            }

            setIsGenerating(true);
            try {
                // Generate Digital Signature Keys
                const keyPair = await generateKeyPair();
                const publicKeyJwk = await exportKey(keyPair.publicKey);
                const privateKeyJwk = await exportKey(keyPair.privateKey);

                // Peer ID based on Phone Number
                // We use a prefix to avoid collisions with random IDs, but keep it deterministic for the user.
                // In a real PDC app, phone number maps to an ID via a Hash Table (DHT). 
                // Here we just use the phone number directly as part of the ID for easy discovery.
                const peerId = `phone-${phone}`;

                const newUser = {
                    username: phone, // Still using 'username' prop for compatibility, but it stores phone
                    password,
                    peerId,
                    publicKey: publicKeyJwk
                };

                // Store User
                users[phone] = newUser;
                localStorage.setItem('chat_users', JSON.stringify(users));

                localStorage.setItem(`private_key_${phone}`, JSON.stringify(privateKeyJwk));

                onLogin(newUser);
            } catch (err) {
                console.error(err);
                setError("Failed to generate secure keys.");
            }
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-[#00a884] p-8 text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">P2P Secure Chat</h1>
                    <p className="text-green-100 opacity-90">Login with Phone Number</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    <div className="flex gap-4 mb-6 bg-gray-100 p-1 rounded-lg">
                        <button
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${isLogin ? 'bg-white shadow text-[#00a884]' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setIsLogin(true)}
                        >
                            Login
                        </button>
                        <button
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${!isLogin ? 'bg-white shadow text-[#00a884]' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setIsLogin(false)}
                        >
                            Signup
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00a884] focus:border-[#00a884] outline-none transition bg-gray-50"
                                placeholder="e.g. 1234567890"
                                value={phone}
                                onChange={handlePhoneChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00a884] focus:border-[#00a884] outline-none transition bg-gray-50"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isGenerating}
                            className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white font-bold py-3 rounded-lg transition transform active:scale-95 shadow-lg disabled:opacity-50"
                        >
                            {isGenerating ? 'Generating Keys...' : (isLogin ? 'Login' : 'Register Number')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
