// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAad1hZscQta9sYaLd4MFMzhJOHLp-SSvk",
  authDomain: "college-voting-system-e1c6a.firebaseapp.com",
  projectId: "college-voting-system-e1c6a",
  storageBucket: "college-voting-system-e1c6a.firebasestorage.app",
  messagingSenderId: "127193604499",
  appId: "1:127193604499:web:e4b1efa2cfa10444048866",
  measurementId: "G-M9YMD728CF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => {
    console.log("Persistence set to LOCAL");
  })
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

  

// DOM Elements
const loginForm = document.getElementById('login-form');
const loginPage = document.getElementById('login-page');
const otpSection = document.getElementById('otp-section');
const verifyOtpButton = document.getElementById('verify-otp');
const votingPage = document.getElementById('voting-page');
const userElectionStatusElement = document.getElementById('user-election-status');
const countdownTimerElement = document.getElementById('countdown-timer');
const logoutButton = document.getElementById('logout-button');
const positionSectionsContainer = document.getElementById('position-sections');

let confirmationResult;
let currentPositionIndex = 0;
let positions = []; // Array to store positions

// Initialize reCAPTCHA
const recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container');

// Check authentication state on page load
auth.onAuthStateChanged((user) => {
  console.log("Auth state changed. User:", user);
  if (user) {
    user.getIdTokenResult().then((idTokenResult) => {
      const isAdmin = idTokenResult.claims.admin === true;
      if (isAdmin) {
        console.log("Admin detected. Redirecting to admin.html");
        auth.signOut().then(() => {
          alert("Admins cannot access the user voting page.");
          window.location.href = "admin.html";
        });
      } else {
        console.log("User logged in. Initializing UI.");
        loginPage.style.display = "none";
        votingPage.style.display = "block"; // Show voting page by default
        loadElectionStatus(); // Load election status first
        loadCandidates(); // Then load candidates
      }
    }).catch((error) => {
      console.error("Error fetching token:", error);
      auth.signOut();
      loginPage.style.display = "flex";
      votingPage.style.display = "none";
    });
  } else {
    console.log("No user logged in. Showing login page.");
    loginPage.style.display = "flex";
    votingPage.style.display = "none";
    noElectionSection.style.display = "none";
    winnerSection.style.display = "none";
  }
});

// OTP Login (Register ID)
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const registerId = document.getElementById("register-id").value;
  console.log("Login attempt with Register ID:", registerId);

  db.collection("voters").doc(registerId).get()
    .then((doc) => {
      if (doc.exists) {
        let phoneNumber = doc.data().phoneNumber.trim();
        if (!phoneNumber.startsWith("+")) phoneNumber = "+91" + phoneNumber.replace(/^0+/, "");
        const phoneNumberPattern = /^\+[1-9]\d{9,14}$/;
        if (!phoneNumberPattern.test(phoneNumber)) {
          alert("Invalid phone number format in database.");
          return;
        }
        console.log("Sending OTP to:", phoneNumber);
        auth.signInWithPhoneNumber(phoneNumber, recaptchaVerifier)
          .then((result) => {
            confirmationResult = result;
            otpSection.style.display = "block";
          })
          .catch((error) => console.error("Error sending OTP:", error));
      } else {
        alert("Register ID not found.");
      }
    })
    .catch((error) => console.error("Error fetching voter:", error));
});

// Verify OTP
verifyOtpButton.addEventListener("click", () => {
  const otp = document.getElementById("otp").value;
  confirmationResult.confirm(otp)
    .then((result) => {
      console.log("OTP verified for user:", result.user);
      loginPage.style.display = "none";
      votingPage.style.display = "block";
      loadCandidates();
      loadElectionStatus();
    })
    .catch((error) => {
      console.error("Error verifying OTP:", error);
      alert("Invalid OTP.");
    });
});

// Google Login
const googleLoginButton = document.getElementById('google-login');
googleLoginButton.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      console.log("Google Login successful:", user);
      loginPage.style.display = 'none'; // Hide login page
      votingPage.style.display = 'block'; // Show voting page
      loadCandidates(); // Load candidates
      loadElectionStatus(); // Load election status
    })
    .catch((error) => {
      console.error("Google Login failed:", error);
      alert("Google login failed. Please try again.");
    });
});

// Function to load election status and handle UI updates
function loadElectionStatus() {
  db.collection("election").doc("duration").onSnapshot((doc) => {
    if (doc.exists) {
      const { status, startTime, endTime } = doc.data();
      const now = new Date().getTime();

      userElectionStatusElement.textContent = status;

      if (status === 'ended') {
        document.getElementById('winner-section').style.display = 'block';
        document.getElementById('voting-page').style.display = 'none';
        document.getElementById('position-sections').style.display = 'none';
        displayWinners(); // Ensure this is called
      } else if (status === 'started' && now >= startTime && now < endTime) {
        document.getElementById('no-election-section').style.display = 'none';
        document.getElementById('winner-section').style.display = 'none';
        votingPage.style.display = 'block';
        document.getElementById('position-sections').style.display = 'block';
        loadCandidates();
        startCountdown(endTime);
      } else if (now >= endTime && status === 'started') {
        db.collection('election').doc('duration').update({ status: 'ended' })
          .then(() => {
            document.getElementById('winner-section').style.display = 'block';
            document.getElementById('voting-page').style.display = 'none';
            document.getElementById('position-sections').style.display = 'none';
            displayWinners(); // Ensure this is called
          })
          .catch((error) => {
            console.error('Error updating election status:', error);
          });
      } else {
        votingPage.style.display = 'none';
        document.getElementById('no-election-section').style.display = 'block';
        document.getElementById('winner-section').style.display = 'none';
        document.getElementById('position-sections').style.display = 'none';
      }
    }
  }, (error) => {
    console.error('Error loading election status:', error);
  });
}



// Helper function to show error messages
function showErrorMessage(message) {
  const popup = document.getElementById('custom-popup');
  const popupMessage = document.getElementById('popup-message');
  popupMessage.textContent = message;
  popup.style.display = 'flex';
  setTimeout(() => {
    popup.style.display = 'none';
  }, 5000);
}



// Load Candidates
async function loadCandidates() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Query votes collection for this user's votes
    const votesQuery = await db.collection('votes')
      .where('userId', '==', user.uid)
      .get();

    const userVotes = {};
    votesQuery.forEach(doc => {
      const vote = doc.data();
      userVotes[vote.position] = vote.candidateId; // Map position to voted candidateId
    });

    const candidatesSnapshot = await db.collection('candidates').get();
    const candidatesByPosition = {};

    candidatesSnapshot.forEach((doc) => {
      const candidate = doc.data();
      const position = candidate.position;
      if (!candidatesByPosition[position]) {
        candidatesByPosition[position] = [];
      }
      candidatesByPosition[position].push({ ...candidate, id: doc.id });
    });

    positions = Object.keys(candidatesByPosition);
    if (positions.every(position => userVotes[position])) {
      showAllVotesCastMessage();
    } else {
      loadCandidatesForPosition(positions[currentPositionIndex], candidatesByPosition, userVotes);
    }
  } catch (error) {
    console.error('Error loading candidates or votes:', error);
    showErrorMessage('Unable to load voting data. Check your permissions or contact support.');
  }
}

// Load Candidates for a Specific Position
function loadCandidatesForPosition(position, candidatesByPosition, userVotes) {
  positionSectionsContainer.innerHTML = ''; // Clear previous content

  const positionSection = document.createElement('div');
  positionSection.className = 'position-section';

  const positionTitle = document.createElement('h2');
  positionTitle.textContent = position;
  positionSection.appendChild(positionTitle);

  const candidatesGrid = document.createElement('div');
  candidatesGrid.className = 'candidates-grid';

  candidatesByPosition[position].forEach((candidate) => {
    const candidateCard = document.createElement('div');
    candidateCard.className = 'candidate-card';
    candidateCard.innerHTML = `
      <img src="${candidate.imageUrl}" alt="${candidate.name}">
      <div class="card-content">
        <h3>${candidate.name}</h3>
        <p><strong>Position:</strong> ${candidate.position}</p>
        <button onclick="voteForCandidate('${candidate.id}')" ${userVotes[position] ? 'disabled style="background-color: #ccc;"' : ''}>Vote</button>
        <button onclick="showModal('${candidate.id}')">Info</button>
      </div>
    `;
    candidatesGrid.appendChild(candidateCard);
  });

  positionSection.appendChild(candidatesGrid);
  positionSectionsContainer.appendChild(positionSection);
}

function showAllVotesCastMessage() {
  db.collection("election").doc("duration").get().then((doc) => {
    if (doc.exists) {
      const { status } = doc.data();
      if (status === "ended") {
        document.getElementById("position-sections").style.display = "none"; // Hide all vote sections
        document.getElementById("winner-section").style.display = "block"; // Show winners
        displayWinners();
        return;
      }
    }

    // If election is still ongoing, show the message
    positionSectionsContainer.innerHTML = ''; // Clear previous content

    const allVotesCastMessage = document.createElement('div');
    allVotesCastMessage.className = 'all-votes-cast-message';
    allVotesCastMessage.innerHTML = `
      <h2>All Votes Cast</h2>
      <p>You have cast your votes for all positions. Thank you!</p>
    `;
    positionSectionsContainer.appendChild(allVotesCastMessage);
  });
}



async function voteForCandidate(candidateId) {
  const user = auth.currentUser;
  if (!user) {
    alert('You must be logged in to vote.');
    return;
  }
  console.log('User UID:', user.uid); // Debug: Verify UID

  try {
    const candidateDoc = await db.collection('candidates').doc(candidateId).get();
    if (!candidateDoc.exists) {
      alert('Candidate not found.');
      return;
    }

    const candidate = candidateDoc.data();
    const position = candidate.position;

    if (await hasUserVotedForPosition(position)) {
      alert('You have already voted for a candidate in this position.');
      return;
    }

    const electionDoc = await db.collection('election').doc('duration').get();
    if (!electionDoc.exists || electionDoc.data().status !== 'started') {
      alert('Voting is not currently active.');
      return;
    }

    const voteData = {
      userId: user.uid,
      position: position,
      candidateId: candidateId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp() // Use server timestamp
    };
    console.log('Vote Data:', voteData); // Debug: Verify data

    await db.collection('votes').add(voteData);

    // Update UI and proceed
    showVoteConfirmationPopup(candidate.name, position);
    disableVoteButtonsForPosition(position);
    currentPositionIndex++;
    if (currentPositionIndex < positions.length) {
      loadCandidates();
    } else {
      showAllVotesCastMessage();
    }
  } catch (error) {
    console.error('Error voting for candidate:', error);
    alert('An error occurred while voting. Please try again.');
  }
}

// Function to check if the user has already voted for a position
async function hasUserVotedForPosition(position) {
  const user = auth.currentUser;
  if (!user) return false;

  const votesQuery = await db.collection('votes')
    .where('userId', '==', user.uid)
    .where('position', '==', position)
    .get();

  return !votesQuery.empty; // True if user has voted for this position
}

// Disable Vote Buttons for a Specific Position
function disableVoteButtonsForPosition(position) {
  const positionHeadings = document.querySelectorAll('.position-section h2');

  for (const heading of positionHeadings) {
    if (heading.textContent.includes(position)) {
      const positionSection = heading.parentElement;
      const voteButtons = positionSection.querySelectorAll('button');
      voteButtons.forEach(button => {
        if (button.textContent === 'Vote') {
          button.disabled = true;
          button.style.backgroundColor = '#ccc'; // Grey out the button
        }
      });
      break;
    }
  }
}

// Show Vote Confirmation Popup
function showVoteConfirmationPopup(candidateName, position) {
  const popup = document.getElementById('custom-popup');
  const popupMessage = document.getElementById('popup-message');
  popupMessage.textContent = `Your vote for ${candidateName} (${position}) has been recorded!`;
  popup.style.display = 'flex';

  // Hide the popup after 3 seconds
  setTimeout(() => {
    popup.style.display = 'none';
  }, 3000);
}

// Close Popup
const closePopupButton = document.querySelector('.close-popup');
const popup = document.getElementById('custom-popup');
closePopupButton.addEventListener('click', () => {
  popup.style.display = 'none';
});


function startCountdown(endTime) {
  const interval = setInterval(() => {
    const now = new Date().getTime();
    const timeLeft = endTime - now;

    if (timeLeft <= 0) {
      clearInterval(interval);
      countdownTimerElement.textContent = '00:00:00';
      // Do not update status here; let the admin or a Cloud Function handle it
      // Simply check the status and react accordingly
      db.collection('election').doc('duration').get()
        .then((doc) => {
          if (doc.exists && doc.data().status === 'ended') {
            displayWinners();
            document.getElementById('winner-section').style.display = 'block';
            document.getElementById('voting-page').style.display = 'none';
          }
        })
        .catch((error) => {
          console.error('Error checking election status:', error);
        });
    } else {
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      countdownTimerElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
  }, 1000);
}

// Logout Buttons
const logoutButtons = document.querySelectorAll('.logout-button');
logoutButtons.forEach(button => {
  button.addEventListener("click", () => {
    auth.signOut()
      .then(() => {
        alert("Logged out successfully!");
        currentPositionIndex = 0;
        window.location.href = "index.html";
      })
      .catch((error) => {
        console.error("Error logging out:", error);
        alert("Error logging out. Please try again.");
      });
  });
});

// Load Election Status and Duration on Page Load
loadElectionStatus();
function updateElectionStatus(newStatus) {
  db.collection('election')
    .doc('duration')
    .update({ status: newStatus })
    .then(() => {
      userElectionStatusElement.textContent = newStatus;
      if (newStatus === 'stopped') {
        votingPage.style.display = 'none';
        document.getElementById('winner-section').style.display = 'block';
        document.getElementById('position-sections').style.display = 'none';
      }
    })
    .catch((error) => {
      console.error('Error updating election status:', error);
    });
} 

// Winner Display Logic
function displayWinners() {
  const winnersContainer = document.getElementById("winners-container");
  winnersContainer.innerHTML = ""; // Clear previous content

  db.collection("candidates").get().then((querySnapshot) => {
    const candidatesByPosition = {};

    // Group candidates by position
    querySnapshot.forEach((doc) => {
      const candidate = doc.data();
      const position = candidate.position;

      if (!candidatesByPosition[position]) {
        candidatesByPosition[position] = [];
      }
      candidatesByPosition[position].push({ ...candidate, id: doc.id });
    });

    // Array to store promises for fetching votes
    const votePromises = [];

    // Iterate over each position and fetch votes for candidates
    for (const position in candidatesByPosition) {
      const positionCandidates = candidatesByPosition[position];

      positionCandidates.forEach((candidate) => {
        const votePromise = db.collection("votes")
          .where("position", "==", position)
          .where("candidateId", "==", candidate.id)
          .get()
          .then((voteSnapshot) => ({
            ...candidate,
            votes: voteSnapshot.size,
          }));

        votePromises.push(votePromise);
      });
    }

    // Wait for all vote promises to resolve
    Promise.all(votePromises).then((candidatesWithVotes) => {
      // Group candidates with votes by position
      const winnersByPosition = {};

      candidatesWithVotes.forEach((candidate) => {
        const position = candidate.position;

        if (!winnersByPosition[position] || candidate.votes > winnersByPosition[position].votes) {
          winnersByPosition[position] = candidate; // Update if this candidate has more votes
        }
      });

      // Display the winners
      for (const position in winnersByPosition) {
        const winner = winnersByPosition[position];

        // Create a card for the winner
        const winnerCard = document.createElement("div");
        winnerCard.className = "winner-card";
        winnerCard.innerHTML = `
          <h3>${position}</h3>
          <div class="winner-details">
            <img src="${winner.imageUrl}" alt="${winner.name}" class="winner-image">
            <div class="winner-info">
              <p><strong>Winner:</strong> ${winner.name}</p>
              <p><strong>Votes:</strong> ${winner.votes}</p>
            </div>
          </div>
        `;
        winnersContainer.appendChild(winnerCard);
      }

      // Trigger confetti animation
      triggerConfetti();
    });
  });
}

// Function to trigger confetti animation
function triggerConfetti() {
  // Check if confetti has already been shown in this session
  if (!sessionStorage.getItem("confettiShown")) {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Set a flag in sessionStorage to indicate confetti has been shown
    sessionStorage.setItem("confettiShown", "true");
  }
}

// Call this when the election stops
function onElectionEnd() {
  displayWinners();
  document.getElementById("voting-page").style.display = "none";
  document.getElementById("winner-section").style.display = "block";
}

// Call this when the election stops
function onElectionEnd() {
  displayWinners();
  document.getElementById("voting-page").style.display = "none";
  document.getElementById("winner-section").style.display = "block";
}
