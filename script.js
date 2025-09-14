const { createClient } = supabase;

        // **IMPORTANT**: These keys are now populated with your new project details.
        const SUPABASE_URL = 'https://pqvvlmanqwxwwfh.supabase.co'; 
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1R5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdnZsbWFucXduY2J4bnh3d2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDY0NDgsImV4cCI6MjA2NTM4MjQ0OH0.kj0WWlYJ8NFwkQpug_Sbk5DYNpshBqeD8u4YGaRo3GQ';

        const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        let currentUser = null;
        let map = null;
        let markers = null;
        let tempMarker = null;
        let submissionData = {};

        // DOM Elements
        const loginModal = document.getElementById('login-modal');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const authModalTitle = document.getElementById('auth-modal-title');
        const authToggleText = document.getElementById('auth-toggle-text');
        const showSignupLink = document.getElementById('show-signup');
        const authErrorEl = document.getElementById('auth-error');

        const addLocationModal = document.getElementById('add-location-modal');
        const messageModal = document.getElementById('message-modal');
        const confirmLocationBar = document.getElementById('confirm-location-bar');
        const loadingSpinner = document.getElementById('loading-spinner');
        const submitButton = document.getElementById('submit-location-btn');
        
        // Initialize map immediately when the script loads
        window.onload = function() {
            console.log('Window loaded, initializing map...');
            
            // Debug: Check map container dimensions
            const mapContainer = document.getElementById('map');
            console.log('Map container dimensions:', {
                width: mapContainer.offsetWidth,
                height: mapContainer.offsetHeight,
                style: window.getComputedStyle(mapContainer)
            });
            
            // Create map instance
            map = L.map('map', {
                center: [23.6850, 90.3563],
                zoom: 7
            });

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Initialize marker cluster group
            markers = L.markerClusterGroup();
            map.addLayer(markers);

            // Force a map resize
            setTimeout(() => {
                map.invalidateSize();
            }, 100);

            // Initialize the rest of the application
            initializeApp();
        };

        // Separate function for app initialization
        async function initializeApp() {
            try {
                const { data } = await db.auth.getSession();
                currentUser = data.session ? data.session.user : null;
                updateUIForAuthState();
                fetchAndDisplayLocations();
                updateStats();
            } catch (error) {
                console.error('App initialization error:', error);
                showMessage('Error', 'Failed to initialize application. Please refresh the page.');
            }
        }

        // Authentication
        db.auth.onAuthStateChange(async (event, session) => {
            const { data } = await db.auth.getSession();
            currentUser = data.session ? data.session.user : null;
            updateUIForAuthState();
            if (event === 'SIGNED_IN') {
                loginModal.classList.add('hidden');
            }
        });

        function updateUIForAuthState() {
            const userActions = document.getElementById('user-actions');
            if (currentUser) {
                let adminButton = '';
                if (currentUser.email === 'hamimhasan0001@gmail.com') {
                    adminButton = `<button id="admin-btn" class="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-yellow-600 transition">Admin</button>`;
                }
                userActions.innerHTML = `<span class="text-sm font-semibold text-gray-700 bg-white/90 p-2 rounded-lg shadow">${currentUser.email}</span>${adminButton}<button id="logout-btn" class="bg-red-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-red-600 transition">Logout</button>`;
                document.getElementById('logout-btn').addEventListener('click', () => db.auth.signOut());
                if (adminButton) {
                    document.getElementById('admin-btn').addEventListener('click', () => {
                        if (isAdminLoggedIn) {
                            openAdminPanel();
                        } else {
                            adminLoginModal.classList.remove('hidden');
                        }
                    });
                }
            } else {
                userActions.innerHTML = `<button id="login-btn" class="bg-green-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-green-600 transition">Login</button>`;
                document.getElementById('login-btn').addEventListener('click', () => loginModal.classList.remove('hidden'));
            }
        }
        
        // --- AUTHENTICATION MODAL LOGIC ---
        function toggleAuthMode(mode) {
             authErrorEl.textContent = '';
            if(mode === 'signup') {
                authModalTitle.textContent = 'Create an Account';
                loginForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
                authToggleText.innerHTML = `Already have an account? <a href="#" id="show-login" class="text-blue-600 font-semibold">Sign In</a>`;
                document.getElementById('show-login').addEventListener('click', (e) => {
                    e.preventDefault();
                    toggleAuthMode('login');
                });
            } else { // 'login'
                authModalTitle.textContent = 'Welcome Back!';
                signupForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
                authToggleText.innerHTML = `Don't have an account? <a href="#" id="show-signup" class="text-blue-600 font-semibold">Sign Up</a>`;
                document.getElementById('show-signup').addEventListener('click', (e) => {
                    e.preventDefault();
                    toggleAuthMode('signup');
                });
            }
        }

        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode('signup');
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            authErrorEl.textContent = '';
            const { error } = await db.auth.signInWithPassword({ email, password });
            if (error) authErrorEl.textContent = error.message;
        });

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            authErrorEl.textContent = '';
            const { error } = await db.auth.signUp({ email, password });
            if (error) {
                authErrorEl.textContent = error.message;
            } else {
                showMessage('Success!', 'Please check your email for a confirmation link to complete your registration.');
                loginModal.classList.add('hidden');
            }
        });
        
        document.getElementById('google-signin-btn').addEventListener('click', () => {
            db.auth.signInWithOAuth({ provider: 'google' });
        });
        
        // UI Modals & Interactions
        function showMessage(title, body) {
            document.getElementById('message-title').textContent = title;
            document.getElementById('message-body').innerHTML = body;
            messageModal.classList.remove('hidden');
        }
        
        document.getElementById('close-message-modal').addEventListener('click', () => messageModal.classList.add('hidden'));

        document.getElementById('add-location-btn').addEventListener('click', () => {
            if (!currentUser) {
                loginModal.classList.remove('hidden');
                return;
            }
            resetAddLocationModal();
            addLocationModal.classList.remove('hidden');
        });
        
        document.getElementById('cancel-add-location').addEventListener('click', () => {
             addLocationModal.classList.add('hidden');
             resetAddLocationModal();
        });

        // Location Submission Flow
        function resetAddLocationModal() {
            submissionData = {};
            document.getElementById('step-1-location').classList.remove('hidden');
            document.getElementById('step-2-image').classList.add('hidden');
            document.getElementById('next-step-btn').classList.add('hidden');
            submitButton.classList.add('hidden');
            loadingSpinner.classList.add('hidden');
            document.getElementById('location-feedback').textContent = '';
            document.getElementById('image-preview').classList.add('hidden');
            document.getElementById('image-upload-input').value = '';
            confirmLocationBar.classList.add('hidden');
            map.getContainer().style.cursor = '';
            if (tempMarker) map.removeLayer(tempMarker);
            tempMarker = null;
        }

        document.getElementById('auto-location-btn').addEventListener('click', () => {
            if (!navigator.geolocation) return;
            document.getElementById('location-feedback').textContent = 'Getting your location...';
            navigator.geolocation.getCurrentPosition(async (position) => {
                submissionData.location = { lat: position.coords.latitude, lng: position.coords.longitude };
                document.getElementById('location-feedback').textContent = `Location acquired.`;
                document.getElementById('next-step-btn').classList.remove('hidden');
            }, () => {
                document.getElementById('location-feedback').textContent = 'Unable to retrieve your location.';
            });
        });

        document.getElementById('manual-location-btn').addEventListener('click', () => {
            addLocationModal.classList.add('hidden');
            tempMarker = L.marker(map.getCenter(), { draggable: true }).addTo(map);
            map.getContainer().style.cursor = 'crosshair';
        });
        
        document.getElementById('confirm-location-btn').addEventListener('click', () => {
            map.getContainer().style.cursor = '';
            confirmLocationBar.classList.add('hidden');
            if (tempMarker) map.removeLayer(tempMarker);
            tempMarker = null;
            addLocationModal.classList.remove('hidden');
            document.getElementById('step-1-location').classList.add('hidden');
            document.getElementById('step-2-image').classList.remove('hidden');
            submitButton.classList.remove('hidden');
        });
        
        document.getElementById('cancel-selection-btn').addEventListener('click', resetAddLocationModal);
        
        document.getElementById('next-step-btn').addEventListener('click', () => {
            document.getElementById('step-1-location').classList.add('hidden');
            document.getElementById('step-2-image').classList.remove('hidden');
            document.getElementById('next-step-btn').classList.add('hidden');
            submitButton.classList.remove('hidden');
        });

        document.getElementById('image-upload-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                submissionData.imageFile = file;
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('image-preview').src = event.target.result;
                    document.getElementById('image-preview').classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
        
        submitButton.addEventListener('click', async () => {
            if (!submissionData.location || !submissionData.imageFile) {
                showMessage('Incomplete Submission', 'Please set a location and upload an image.');
                return;
            }
            loadingSpinner.classList.remove('hidden');
            submitButton.classList.add('hidden');
            
            const apiKey = 'ea637eaf8dff6f7975ac91f3df37786b';
            const formData = new FormData();
            formData.append('key', apiKey);
            formData.append('image', submissionData.imageFile);

            let imageUrl;
            try {
                const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
                const imgbbResult = await imgbbResponse.json();
                if (!imgbbResult.success) throw new Error(imgbbResult.error.message);
                imageUrl = imgbbResult.data.url;
            } catch (error) {
                showMessage('Image Upload Failed', error.message);
                loadingSpinner.classList.add('hidden');
                submitButton.classList.remove('hidden');
                return;
            }

            const { error } = await db.from('submissions').insert({
                submitter_name: currentUser.email,
                image_url: imageUrl,
                status: 'pending',
                location: submissionData.location,
                reports: { wrongPlace: 0, cleaned: 0 },
                view_count: 0
            });
            
            if (error) {
                // Better error logging
                console.error("Supabase insert error:", error);
                showMessage('Database Error', `Could not save submission. Error: ${error.message}`);
                loadingSpinner.classList.add('hidden');
                submitButton.classList.remove('hidden');
            } else {
                resetAddLocationModal();
                addLocationModal.classList.add('hidden');
                showMessage('Submission Received!', 'Thanks for your awareness. An admin will review your request.');
                fetchAndDisplayLocations(); 
                updateStats(); 
            }
        });

        // Data Fetching and Display
        async function fetchAndDisplayLocations() {
            markers.clearLayers();
            const { data, error } = await db.from('submissions').select('*').eq('status', 'approved');
            if (error) {
                console.error("Error fetching locations:", error);
                if (error.code === '42P01') {
                    showMessage('Database Setup Incomplete', 'The "submissions" table does not exist. Please run the setup script in your Supabase SQL Editor.');
                }
                return;
            }
            
            data.forEach((item) => {
                if(item.location && item.location.lat && item.location.lng) {
                    const marker = L.marker([item.location.lat, item.location.lng]);
                    const popupContent = `
                        <img src="${item.image_url}" alt="Trash" class="custom-popup-image" onerror="this.src='https://placehold.co/400x200?text=Image+Missing'">
                        <p>Reported by ${item.submitter_name}</p>
                        <p>Submission #${item.submission_id}</p>
                        <p>Views: ${item.view_count}</p>
                        <p>Reports: Wrong Place (${item.reports?.wrongPlace || 0}), Cleaned (${item.reports?.cleaned || 0})</p>
                    `;
                    marker.bindPopup(popupContent);
                    markers.addLayer(marker);
                }
            });
        }
        
        async function updateStats() {
            const { data, error } = await db.from('submissions').select('status, created_at');
            if(error) return;

            let total = data.filter(d => d.status === 'approved').length;
            let cleaned = data.filter(d => d.status === 'cleaned').length;
            const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            let thisMonth = data.filter(d => {
                const createdAt = new Date(d.created_at);
                return createdAt >= firstDayOfMonth && (d.status === 'approved' || d.status === 'cleaned');
            }).length;

            document.getElementById('total-locations').textContent = total;
            document.getElementById('cleaned-locations').textContent = cleaned;
            document.getElementById('month-locations').textContent = thisMonth;
        }
        
        // Settings Modal Logic
        const settingsModal = document.getElementById('settings-modal');
        const settingsBtn = document.getElementById('settings-btn');
        const closeSettings = document.getElementById('close-settings');
        const saveSettings = document.getElementById('save-settings');

        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
            if (currentUser) {
                document.getElementById('profile-email').value = currentUser.email;
                // You can add more profile data population here
            }
            updateLeaderboard();
        });

        closeSettings.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        saveSettings.addEventListener('click', async () => {
            // Save settings logic here
            const displayName = document.getElementById('display-name').value;
            const language = document.getElementById('language-select').value;
            
            // Example: Save to user metadata in Supabase
            if (currentUser) {
                const { error } = await db.auth.updateUser({
                    data: {
                        display_name: displayName,
                        preferred_language: language
                    }
                });

                if (error) {
                    showMessage('Error', 'Failed to save settings');
                } else {
                    showMessage('Success', 'Settings saved successfully');
                    settingsModal.classList.add('hidden');
                }
            }
        });

        async function updateLeaderboard() {
            const leaderboardList = document.getElementById('leaderboard-list');
            
            // Fetch top contributors from Supabase
            const { data, error } = await db.from('submissions')
                .select('submitter_name, count(*)')
                .group('submitter_name')
                .order('count', { ascending: false })
                .limit(5);

            if (!error && data) {
                leaderboardList.innerHTML = data.map((item, index) => `
                    <div class="flex items-center justify-between py-2">
                        <span class="flex items-center gap-2">
                            ${index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                            ${item.submitter_name}
                        </span>
                        <span class="font-semibold">${item.count} submissions</span>
                    </div>
                `).join('');
            }
        }

        // Admin access button logic
        document.getElementById('admin-access-btn').addEventListener('click', () => {
            if (currentUser?.email === 'hamimhasan0001@gmail.com') {
                // Show admin panel
                showMessage('Admin Access', 'Welcome to the admin panel');
            } else {
                showMessage('Access Denied', 'You need admin privileges to access this section');
            }
        });

        // Language selection logic
        document.getElementById('language-select').addEventListener('change', (e) => {
            const language = e.target.value;
            // Here you can add logic to change the UI language
            // For now, we'll just save it to user preferences
            if (currentUser) {
                db.auth.updateUser({
                    data: { preferred_language: language }
                });
            }
        });

        // Admin Panel Logic
        const adminLoginModal = document.getElementById('admin-login-modal');
        const adminPanelModal = document.getElementById('admin-panel-modal');
        const adminLoginForm = document.getElementById('admin-login-form');
        const adminLoginError = document.getElementById('admin-login-error');
        let isAdminLoggedIn = false;

        // Admin credentials
        const ADMIN_EMAIL = 'hamimhasan0001@gmail.com';
        const ADMIN_PASSWORD = '11646871';

        document.getElementById('admin-access-btn').addEventListener('click', () => {
            if (isAdminLoggedIn) {
                openAdminPanel();
            } else {
                adminLoginModal.classList.remove('hidden');
            }
        });

        document.getElementById('cancel-admin-login').addEventListener('click', () => {
            adminLoginModal.classList.add('hidden');
            adminLoginForm.reset();
            adminLoginError.textContent = '';
        });

        document.getElementById('close-admin-panel').addEventListener('click', () => {
            adminPanelModal.classList.add('hidden');
        });

        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;

            if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                isAdminLoggedIn = true;
                adminLoginModal.classList.add('hidden');
                adminLoginForm.reset();
                openAdminPanel();
            } else {
                adminLoginError.textContent = 'Invalid admin credentials';
            }
        });

        async function openAdminPanel() {
            console.log('Opening admin panel...');
            
            // Debug database first
            await debugDatabase();
            
            adminPanelModal.classList.remove('hidden');
            
            // Show dashboard by default
            document.getElementById('tab-dashboard').click();
            
            // Load initial data
            await Promise.all([
                loadPendingSubmissions(),
                updateAdminStats(),
                loadRecentActivity()
            ]);
        }

        async function updateAdminStats() {
            console.log('Updating admin stats...');
            const { data, error } = await db.from('submissions').select('*');
            
            if (error) {
                console.error('Error fetching stats:', error);
                return;
            }

            const total = data.length;
            const pending = data.filter(item => item.status === 'pending').length;
            const today = new Date().toISOString().split('T')[0];
            const approvedToday = data.filter(item => 
                item.status === 'approved' && 
                item.created_at.startsWith(today)
            ).length;

            document.getElementById('admin-total-submissions').textContent = total;
            document.getElementById('admin-pending-count').textContent = pending;
            document.getElementById('admin-approved-today').textContent = approvedToday;
        }

        async function loadPendingSubmissions() {
            console.log('Loading pending submissions...');
            const { data, error } = await db.from('submissions')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading pending submissions:', error);
                showMessage('Error', 'Failed to load pending submissions');
                return;
            }

            console.log('Pending submissions:', data);

            const pendingSubmissionsEl = document.getElementById('pending-submissions');
            if (!pendingSubmissionsEl) {
                console.error('Pending submissions element not found');
                return;
            }

            if (!data || data.length === 0) {
                pendingSubmissionsEl.innerHTML = '<p class="text-gray-500 text-center py-4">No pending submissions</p>';
                return;
            }

            pendingSubmissionsEl.innerHTML = data.map(submission => `
                <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <div class="flex items-start gap-4">
                        <div class="w-32 h-32 flex-shrink-0">
                            <img src="${submission.image_url}" alt="Submission" 
                                class="w-full h-full object-cover rounded-lg">
                        </div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-sm text-gray-500">Submitted by: ${submission.submitter_name}</p>
                                    <p class="text-sm text-gray-500">Date: ${new Date(submission.created_at).toLocaleString()}</p>
                                    <p class="text-sm text-gray-500">Location: ${submission.location ? 
                                        `${submission.location.lat.toFixed(4)}, ${submission.location.lng.toFixed(4)}` : 'N/A'}</p>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="handleSubmission(${submission.submission_id}, 'approved')" 
                                        class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition">
                                        Approve
                                    </button>
                                    <button onclick="handleSubmission(${submission.submission_id}, 'rejected')"
                                        class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            // Update stats after loading submissions
            updateAdminStats();
        }

        async function handleSubmission(submissionId, status) {
            console.log('Handling submission:', submissionId, status);
            
            const { error } = await db.from('submissions')
                .update({ status })
                .eq('submission_id', submissionId);

            if (error) {
                console.error('Error updating submission:', error);
                showMessage('Error', 'Failed to update submission status');
                return;
            }

            showMessage('Success', `Submission ${status} successfully`);
            
            // Reload all necessary data
            await loadPendingSubmissions();
            await loadAllSubmissions();
            await updateAdminStats();
            await fetchAndDisplayLocations();
            await loadRecentActivity();
        }

        // Admin Panel Tab Management
        const tabButtons = ['tab-dashboard', 'tab-pending', 'tab-all'];
        const tabContents = ['content-dashboard', 'content-pending', 'content-all'];

        tabButtons.forEach(buttonId => {
            document.getElementById(buttonId).addEventListener('click', () => {
                // Update button styles
                tabButtons.forEach(id => {
                    const button = document.getElementById(id);
                    if (id === buttonId) {
                        button.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
                        button.classList.remove('text-gray-500');
                    } else {
                        button.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
                        button.classList.add('text-gray-500');
                    }
                });

                // Show/hide content
                const contentId = buttonId.replace('tab-', 'content-');
                tabContents.forEach(id => {
                    document.getElementById(id).classList.toggle('hidden', id !== contentId);
                });

                // Load content if needed
                if (contentId === 'content-pending') {
                    loadPendingSubmissions();
                } else if (contentId === 'content-all') {
                    loadAllSubmissions();
                } else if (contentId === 'content-dashboard') {
                    updateAdminStats();
                    loadRecentActivity();
                }
            });
        });

        // Admin Panel Content Loading
        async function loadAllSubmissions() {
            const { data, error } = await db.from('submissions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                showMessage('Error', 'Failed to load submissions');
                return;
            }

            const tbody = document.getElementById('all-submissions');
            tbody.innerHTML = data.map(submission => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${submission.submission_id}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <img src="${submission.image_url}" alt="Submission" class="h-16 w-16 object-cover rounded">
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${submission.submitter_name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${submission.location ? `${submission.location.lat.toFixed(4)}, ${submission.location.lng.toFixed(4)}` : 'N/A'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${submission.status === 'approved' ? 'bg-green-100 text-green-800' : 
                            submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            submission.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'}">
                            ${submission.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${new Date(submission.created_at).toLocaleDateString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div class="flex space-x-2">
                            ${submission.status === 'pending' ? `
                                <button onclick="handleSubmission(${submission.submission_id}, 'approved')"
                                    class="text-green-600 hover:text-green-900">Approve</button>
                                <button onclick="handleSubmission(${submission.submission_id}, 'rejected')"
                                    class="text-red-600 hover:text-red-900">Reject</button>
                            ` : `
                                <button onclick="deleteSubmission(${submission.submission_id})"
                                    class="text-red-600 hover:text-red-900">Delete</button>
                            `}
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        async function loadRecentActivity() {
            const { data, error } = await db.from('submissions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) return;

            const activityEl = document.getElementById('recent-activity');
            activityEl.innerHTML = data.map(item => `
                <div class="flex items-center justify-between py-2">
                    <div>
                        <p class="text-sm text-gray-600">
                            New submission from ${item.submitter_name}
                        </p>
                        <p class="text-xs text-gray-400">
                            ${new Date(item.created_at).toLocaleString()}
                        </p>
                    </div>
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${item.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        item.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'}">
                        ${item.status}
                    </span>
                </div>
            `).join('');
        }

        // Bulk Actions
        document.getElementById('approve-all-btn').addEventListener('click', async () => {
            if (!confirm('Are you sure you want to approve all pending submissions?')) return;

            const { error } = await db.from('submissions')
                .update({ status: 'approved' })
                .eq('status', 'pending');

            if (error) {
                showMessage('Error', 'Failed to approve submissions');
                return;
            }

            showMessage('Success', 'All pending submissions have been approved');
            loadPendingSubmissions();
            updateAdminStats();
            fetchAndDisplayLocations();
        });

        document.getElementById('reject-all-btn').addEventListener('click', async () => {
            if (!confirm('Are you sure you want to reject all pending submissions?')) return;

            const { error } = await db.from('submissions')
                .update({ status: 'rejected' })
                .eq('status', 'pending');

            if (error) {
                showMessage('Error', 'Failed to reject submissions');
                return;
            }

            showMessage('Success', 'All pending submissions have been rejected');
            loadPendingSubmissions();
            updateAdminStats();
        });

        // Filtering and Search
        document.getElementById('status-filter').addEventListener('change', loadAllSubmissions);
        document.getElementById('search-submissions').addEventListener('input', debounce(loadAllSubmissions, 300));

        async function deleteSubmission(submissionId) {
            if (!confirm('Are you sure you want to delete this submission? This action cannot be undone.')) return;

            const { error } = await db.from('submissions')
                .delete()
                .eq('submission_id', submissionId);

            if (error) {
                showMessage('Error', 'Failed to delete submission');
                return;
            }

            showMessage('Success', 'Submission deleted successfully');
            loadAllSubmissions();
            updateAdminStats();
            fetchAndDisplayLocations();
        }

        // Utility function for debouncing
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // Add debug function
        async function debugDatabase() {
            console.log('Checking database connection...');
            
            // Check all submissions
            const { data: allData, error: allError } = await db.from('submissions').select('*');
            console.log('All submissions:', allData, 'Error:', allError);
            
            // Check pending submissions
            const { data: pendingData, error: pendingError } = await db.from('submissions')
                .select('*')
                .eq('status', 'pending');
            console.log('Pending submissions:', pendingData, 'Error:', pendingError);
        }
