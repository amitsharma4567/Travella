// js for login sign up// Buttons
const loginBtn = document.querySelector('.login-btn');
const signupBtn = document.querySelector('.signup-btn');
const getStartedBtn = document.querySelector('.hero button');

// Modals
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');

// Close buttons
const closeLogin = document.querySelector('.close-login');
const closeSignup = document.querySelector('.close-signup');

// Open modals
loginBtn.onclick = () => loginModal.style.display = 'flex';
signupBtn.onclick = () => signupModal.style.display = 'flex';
getStartedBtn.onclick = () => signupModal.style.display = 'flex';

// Close modals
closeLogin.onclick = () => loginModal.style.display = 'none';
closeSignup.onclick = () => signupModal.style.display = 'none';

// Click outside to close
window.onclick = (e) => {
    if (e.target === loginModal) loginModal.style.display = 'none';
    if (e.target === signupModal) signupModal.style.display = 'none';
};

const switchToSignup = document.getElementById('switchToSignup');
const switchToLogin = document.getElementById('switchToLogin');

switchToSignup.onclick = (e) => {
    e.preventDefault();
    loginModal.style.display = 'none';
    signupModal.style.display = 'flex';
};

switchToLogin.onclick = (e) => {
    e.preventDefault();
    signupModal.style.display = 'none';
    loginModal.style.display = 'flex';
};
