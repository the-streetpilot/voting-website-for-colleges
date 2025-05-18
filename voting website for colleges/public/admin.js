// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAad1hZscQta9sYaLd4MFMzhJOHLp-SSvk",
  authDomain: "college-voting-system-e1c6a.firebaseapp.com",
  projectId: "college-voting-system-e1c6a",
  storageBucket: "college-voting-system-e1c6a.firebasestorage.app",
  messagingSenderId: "127193604499",
  appId: "1:127193604499:web:e4b1efa2cfa10444048866",
  measurementId: "G-M9YMD728CF",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// List of admin emails
const adminEmails = [
  "admin@example.com",
  "the.streetpilot.husky@gmail.com",
  "sameensardar@gmail.com",
  "admin3@example.com",
  "admin4@example.com"
];

// Check if the user is an admin
function isAdmin(email) {
  return adminEmails.includes(email);
}

// Set persistence to LOCAL
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => {
    console.log("Persistence set to LOCAL");
  })
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

// DOM Elements
const loginPage = document.getElementById("login-page");
const loginForm = document.getElementById("login-form");
const adminPanel = document.getElementById("admin-panel");
const logoutButton = document.getElementById("logout-button");
const candidateForm = document.getElementById("candidate-form");
const candidatesList = document.getElementById("candidates");
const startTimeInput = document.getElementById("start-time");
const endTimeInput = document.getElementById("end-time");
const setDurationButton = document.getElementById("set-duration");
const startElectionButton = document.getElementById("start-election");
const stopElectionButton = document.getElementById("stop-election");
const pauseElectionButton = document.getElementById("pause-election");
const electionStatusElement = document.getElementById("election-status");
const totalVotesElement = document.getElementById("total-votes");
const votesPerCandidateElement = document.getElementById("votes-per-candidate");
const resetVotesButton = document.getElementById("reset-votes");
const editCandidateModal = document.getElementById("edit-candidate-modal");
const closeModalButton = document.querySelector(".close-modal");
const editCandidateForm = document.getElementById("edit-candidate-form");
let currentCandidateId = null; // To store the ID of the candidate being edited

// Sidebar Links
const analyticsLink = document.getElementById("analytics-link");
const candidatesLink = document.getElementById("candidates-link");
const addVotersLink = document.getElementById("add-voters-link"); // Add this line
const addVotersPage = document.getElementById("add-voters-page"); // Add this line
const electionControlLink = document.getElementById("election-control-link");
const addCandidateLink = document.getElementById("add-candidate-link"); 
const addCandidatePage = document.getElementById("add-candidate-page"); 

// Content Sections
const contentSections = document.querySelectorAll(".content-section");

// Function to show a specific content section and hide others
function showSection(sectionId) {
  contentSections.forEach((section) => {
    if (section.id === sectionId) {
      section.style.display = "block";
    } else {
      section.style.display = "none";
    }
  });
}

// Event Listeners for Sidebar Links
analyticsLink.addEventListener("click", () => {
  showSection("analytics-page");
  loadAnalytics();
});

candidatesLink.addEventListener("click", () => {
  showSection("candidates-page");
  loadCandidates();
});

addCandidateLink.addEventListener("click", () => {
  showSection("add-candidate-page");
});

addVotersLink.addEventListener("click", () => { // Add this block
  showSection("add-voters-page");
});

electionControlLink.addEventListener("click", () => {
  showSection("election-control-page");
});



// Initialize Election Status
let electionStatus = "not_started"; // Possible values: not_started, started, stopped, paused

// Check authentication state on page load
auth.onAuthStateChanged((user) => {
  console.log("Auth state changed. User:", user);
  if (user) {
    console.log("User email:", user.email);
    if (isAdmin(user.email)) {
      loginPage.style.display = "none";
      adminPanel.style.display = "flex";
      loadCandidates();
      loadAnalytics();
      loadElectionStatus();
    } else {
      console.log("User is not an admin. Logging out and redirecting.");
      auth.signOut().then(() => {
        alert("You are not authorized to access the admin panel.");
        window.location.href = "index.html"; // Redirect to user page
      });
    }
  } else {
    console.log("No user is logged in. Showing login page.");
    loginPage.style.display = "flex";
    adminPanel.style.display = "none";
  }
});

// Login Form Submission
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  console.log("Login attempt with email:", email);

  auth
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log("Login successful. User:", userCredential.user);
      if (isAdmin(userCredential.user.email)) {
        alert("Login successful!");
        loginPage.style.display = "none";
        adminPanel.style.display = "flex";
        loadCandidates();
        loadAnalytics();
        loadElectionStatus();
      } else {
        auth.signOut().then(() => {
          alert("You are not authorized to access the admin panel.");
          window.location.href = "index.html";
        });
      }
    })
    .catch((error) => {
      console.error("Error logging in:", error);
      alert("Invalid email or password.");
    });
});
// Logout Button
logoutButton.addEventListener("click", () => {
  auth.signOut().then(() => {
    alert("Logged out successfully!");
    window.location.href = "index.html";
  }).catch((error) => {
    console.error("Error logging out:", error);
    alert("Error logging out. Please try again.");
  });
});

const endElectionButton = document.getElementById('end-election');
endElectionButton.addEventListener('click', () => {
  endElection();
});

function endElection() {
  db.collection("election").doc("duration").update({ status: "ended" })
    .then(() => {
      alert("Election has been ended.");
      document.getElementById("voting-page").style.display = "none"; // Hide voting page
      document.getElementById("position-sections").style.display = "none"; // Hide all votes cast section
      document.getElementById("winner-section").style.display = "block"; // Show winners
      displayWinners(); // Call function to show winners
    })
    .catch((error) => {
      console.error("Error ending election:", error);
      alert("Error ending election: " + error.message);
    });
}



// Load and display voters
function loadVoters() {
  const votersList = document.getElementById('voters-list');
  votersList.innerHTML = ''; // Clear previous list

  db.collection('voters').get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      const voter = doc.data();
      const li = document.createElement('li');
      li.textContent = `Register ID: ${voter.registerId} | Phone: ${voter.phoneNumber}`;
      votersList.appendChild(li);
    });
  }).catch((error) => {
    console.error("Error loading voters:", error);
  });
}

// Call this function when page loads or when voters are uploaded
addVotersLink.addEventListener("click", () => {
  showSection("add-voters-page");
  loadVoters();
});


// Reset Voters Button
document.getElementById('reset-voters-btn').addEventListener('click', function () {
  if (confirm("Are you sure you want to delete all voters? This action cannot be undone.")) {
    db.collection('voters').get().then((querySnapshot) => {
      const batch = db.batch();
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      return batch.commit();
    }).then(() => {
      alert("All voters have been deleted.");
      loadVoters(); // Refresh list
    }).catch((error) => {
      console.error("Error deleting voters:", error);
    });
  }
});



// Function to generate and download a sample Excel file
function downloadSampleExcel() {
  const workbook = XLSX.utils.book_new();
  const worksheetData = [
    ["registerId", "phoneNumber"],
    ["12345", "+911234567890"], // Use E.164 format in the sample
    ["67890", "+919876543210"],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Voters");
  XLSX.writeFile(workbook, "sample_voters.xlsx");
}


document.getElementById('add-voters-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const file = document.getElementById('voters-file').files[0];
  if (!file) {
    alert("Please select a file.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (json.length === 0) {
        alert("Excel file is empty or invalid format.");
        return;
      }

      const batch = db.batch();

      json.forEach((row) => {
        if (!row.registerId || !row.phoneNumber) {
          console.error("Invalid row skipped:", row);
          return;
        }

        // Normalize phone number to E.164 format
        let phoneNumber = row.phoneNumber.toString().trim();
        // Remove any non-digit characters except the leading '+'
        phoneNumber = phoneNumber.replace(/[^\d+]/g, '');
        // Ensure it starts with a '+' followed by country code
        if (!phoneNumber.startsWith('+')) {
          // Default to +91 (India) if no country code is provided; adjust as needed
          phoneNumber = '+91' + phoneNumber.replace(/^0+/, ''); // Remove leading zeros
        }

        // Validate phone number length (e.g., 12 digits with country code like +911234567890)
        if (phoneNumber.length < 11 || phoneNumber.length > 15) {
          console.error("Invalid phone number length skipped:", phoneNumber);
          return;
        }

        const docRef = db.collection('voters').doc(row.registerId.toString());
        batch.set(docRef, {
          registerId: row.registerId.toString(),
          phoneNumber: phoneNumber,
        });
      });

      batch.commit().then(() => {
        alert('Voters uploaded successfully!');
        loadVoters();
      }).catch((error) => {
        console.error("Error uploading voters:", error);
        alert("Error uploading voters. Please try again.");
      });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      alert("Error processing Excel file. Please check file format and ensure it matches the sample.");
    }
  };

  reader.readAsArrayBuffer(file);
});



// Function to update the election status display
function updateElectionStatusDisplay(status) {
  const statusDisplay = document.getElementById('election-status-display');
  const statusText = document.getElementById('election-status-text');

  statusDisplay.className = `election-status-display status-${status}`;
  statusText.textContent = getStatusText(status);
}

// Update the status text function to handle the 'ended' status
function getStatusText(status) {
  switch (status) {
    case 'started':
      return 'Election Going On';
    case 'stopped':
      return 'No Election Going On';
    case 'paused':
      return 'Election Paused';
    case 'ended':
      return 'Election Ended';
    default:
      return 'No Election Going On';
  }
}

// Update the election status display when the status changes
function updateElectionStatus(newStatus) {
  db.collection("election")
    .doc("duration")
    .update({ status: newStatus })
    .then(() => {
      electionStatus = newStatus;
      electionStatusElement.textContent = newStatus;
      updateElectionStatusDisplay(newStatus);
      alert(`Election status updated to: ${newStatus}`);
    })
    .catch((error) => {
      console.error("Error updating election status:", error);
    });
}

function loadElectionStatus() {
  db.collection("election")
    .doc("duration")
    .onSnapshot(
      (doc) => {
        if (doc.exists) {
          electionStatus = doc.data().status || "not_started";
          electionStatusElement.textContent = electionStatus;
          updateElectionStatusDisplay(electionStatus);

          if (electionStatus === "ended") {
            showSection("analytics-page"); // Switch to analytics page
            document.getElementById("main-content").style.display = "block";
            displayWinners(); // Display winners when status is "ended"
          }
        } else {
          electionStatus = "not_started";
          electionStatusElement.textContent = electionStatus;
          updateElectionStatusDisplay(electionStatus);
        }
      },
      (error) => {
        console.error("Error loading election status:", error);
        alert("Failed to load election status. Check your connection or permissions.");
      }
    );
}

// Function to update election status in Firestore
function updateElectionStatus(newStatus) {
  db.collection("election")
    .doc("duration")
    .update({ status: newStatus })
    .then(() => {
      electionStatus = newStatus;
      electionStatusElement.textContent = newStatus;
      alert(`Election status updated to: ${newStatus}`);
    })
    .catch((error) => {
      console.error("Error updating election status:", error);
    });
}

// Set Election Duration
setDurationButton.addEventListener("click", () => {
  const startTime = new Date(startTimeInput.value).getTime();
  const endTime = new Date(endTimeInput.value).getTime();

  if (startTime >= endTime) {
    alert("End time must be after start time.");
    return;
  }

  db.collection("election")
    .doc("duration")
    .set({
      startTime: startTime,
      endTime: endTime,
      status: "not_started", // Default status
    })
    .then(() => {
      alert("Election duration set successfully!");
    })
    .catch((error) => {
      console.error("Error setting election duration:", error);
    });
});

// Start Election
startElectionButton.addEventListener("click", () => {
  db.collection("election")
    .doc("duration")
    .get()
    .then((doc) => {
      if (doc.exists) {
        const electionData = doc.data();
        const startTime = electionData.startTime;
        const endTime = electionData.endTime;

        // Check if duration is set
        if (!startTime || !endTime) {
          alert("Please set the election duration before starting the election.");
          return;
        }

        const now = new Date().getTime();

        if (now < startTime) {
          alert("Election cannot start before the scheduled start time.");
        } else if (now >= endTime) {
          alert("Election cannot start after the scheduled end time.");
        } else {
          updateElectionStatus("started");
        }
      } else {
        // If the document does not exist, prompt the admin to set the duration
        alert("Please set the election duration before starting the election.");
      }
    })
    .catch((error) => {
      console.error("Error fetching election duration:", error);
    });
});

// Stop or Pause Election
stopElectionButton.addEventListener("click", () => {
  updateElectionStatus("stopped");
});

pauseElectionButton.addEventListener("click", () => {
  updateElectionStatus("paused");
});

// Reset Votes
resetVotesButton.addEventListener("click", resetVotes);

async function resetVotes() {
  if (confirm("Are you sure you want to reset all votes? This action cannot be undone.")) {
    try {
      const votesSnapshot = await db.collection("votes").get();
      const batch = db.batch();
      votesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      alert("All votes have been reset successfully!");
      loadAnalytics(); // Refresh the analytics to reflect the reset
    } catch (error) {
      console.error("Error resetting votes:", error);
      alert("Error resetting votes. Please try again.");
    }
  }
}

// Load Analytics Data with Real-Time Updates
function loadAnalytics() {
  // Clear previous content
  votesPerCandidateElement.innerHTML = "";

  // Group candidates by position
  const candidatesByPosition = {};

  // Listen for changes in the candidates collection
  db.collection("candidates").onSnapshot((candidatesSnapshot) => {
    // Clear previous content
    votesPerCandidateElement.innerHTML = "";

    // Group candidates by position
    candidatesSnapshot.forEach((doc) => {
      const candidate = doc.data();
      const position = candidate.position;

      if (!candidatesByPosition[position]) {
        candidatesByPosition[position] = [];
      }
      candidatesByPosition[position].push({ ...candidate, id: doc.id });
    });

    // Iterate over each position and display votes
    for (const position in candidatesByPosition) {
      const positionSection = document.createElement("div");
      positionSection.className = "position-section";

      const positionTitle = document.createElement("h3");
      positionTitle.textContent = position;
      positionSection.appendChild(positionTitle);

      const candidatesList = document.createElement("div");
      candidatesList.className = "candidates-list";

      // Fetch votes for each candidate in this position
      candidatesByPosition[position].forEach((candidate) => {
        const candidateVotes = document.createElement("p");
        candidateVotes.id = `votes-${candidate.id}`; // Unique ID for each candidate's vote count
        candidateVotes.textContent = `${candidate.name}: 0 votes`; // Initialize with 0 votes
        candidatesList.appendChild(candidateVotes);

        // Listen for changes in votes for this candidate
        db.collection("votes")
          .where(position, "==", candidate.id) // Filter votes for this candidate in this position
          .onSnapshot((votesSnapshot) => {
            const votesCount = votesSnapshot.size;
            document.getElementById(`votes-${candidate.id}`).textContent = `${candidate.name}: ${votesCount} votes`;
          });
      });

      positionSection.appendChild(candidatesList);
      votesPerCandidateElement.appendChild(positionSection);
    }
  });

  // Listen for changes in the total votes across all positions
  db.collection("votes").onSnapshot((votesSnapshot) => {
    let totalVotes = 0;

    // Calculate total votes across all positions
    votesSnapshot.forEach((doc) => {
      const voteData = doc.data();
      totalVotes += Object.keys(voteData).length; // Count the number of positions voted for in this document
    });

    totalVotesElement.textContent = totalVotes;
  });
}

// Add Candidate
candidateForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("candidate-name").value;
  const position = document.getElementById("candidate-position").value;
  const bio = document.getElementById("candidate-bio").value;
  const imageFile = document.getElementById("candidate-image").files[0];

  if (!imageFile) {
    alert("Please select an image file.");
    return;
  }

  const storageRef = storage.ref(`candidates/${imageFile.name}`);
  storageRef
    .put(imageFile)
    .then((snapshot) => {
      return snapshot.ref.getDownloadURL();
    })
    .then((imageUrl) => {
      return db.collection("candidates").add({
        name: name,
        position: position,
        bio: bio,
        imageUrl: imageUrl,
        votes: 0,
      });
    })
    .then(() => {
      alert("Candidate added successfully!");
      candidateForm.reset();
      loadCandidates(); // Refresh the candidates list
      loadAnalytics(); // Refresh the analytics to reflect the new candidate
    })
    .catch((error) => {
      console.error("Error adding candidate:", error);
      alert("Error adding candidate. Please try again.");
    });
});

function loadCandidates() {
  db.collection("candidates")
    .get()
    .then((querySnapshot) => {
      candidatesList.innerHTML = ""; // Clear the list
      querySnapshot.forEach((doc) => {
        const candidate = doc.data();
        const candidateCard = document.createElement("div");
        candidateCard.className = "candidate-card";
        candidateCard.innerHTML = `
  <img src="${candidate.imageUrl}" alt="${candidate.name}">
  <div class="card-content">
    <h3>${candidate.name}</h3>
    <p><strong>Position:</strong> ${candidate.position}</p>
    <button onclick="openEditModal('${doc.id}', '${encodeURIComponent(JSON.stringify(candidate))}')">Edit</button>
    <button onclick="deleteCandidate('${doc.id}')">Delete</button>
  </div>
`;
        candidatesList.appendChild(candidateCard);
      });
    })
    .catch((error) => {
      console.error("Error loading candidates:", error);
    });
}

// Function to delete a candidate
function deleteCandidate(candidateId) {
  if (confirm("Are you sure you want to delete this candidate?")) {
    db.collection("candidates")
      .doc(candidateId)
      .delete()
      .then(() => {
        alert("Candidate deleted successfully!");
        loadCandidates(); // Refresh the candidates list
      })
      .catch((error) => {
        console.error("Error deleting candidate:", error);
        alert("Error deleting candidate. Please try again.");
      });
  }
}

// Function to open the edit modal
function openEditModal(candidateId, candidateData) {
  currentCandidateId = candidateId;
  document.getElementById("edit-candidate-name").value = candidateData.name;
  document.getElementById("edit-candidate-position").value = candidateData.position;
  document.getElementById("edit-candidate-bio").value = candidateData.bio;
  editCandidateModal.style.display = "block";
}

// Function to close the edit modal
function closeEditModal() {
  editCandidateModal.style.display = "none";
  currentCandidateId = null;
}

// Event listener to close the modal when the close button is clicked
closeModalButton.addEventListener("click", closeEditModal);

// Event listener to close the modal when clicking outside the modal
window.addEventListener("click", (event) => {
  if (event.target === editCandidateModal) {
    closeEditModal();
  }
});

// Function to handle editing a candidate
editCandidateForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("edit-candidate-name").value;
  const position = document.getElementById("edit-candidate-position").value;
  const bio = document.getElementById("edit-candidate-bio").value;
  const imageFile = document.getElementById("edit-candidate-image").files[0];

  if (!currentCandidateId) {
    alert("No candidate selected for editing.");
    return;
  }

  // If a new image is uploaded, update the image URL
  if (imageFile) {
    const storageRef = storage.ref(`candidates/${imageFile.name}`);
    storageRef
      .put(imageFile)
      .then((snapshot) => snapshot.ref.getDownloadURL())
      .then((imageUrl) => {
        // Update candidate data with the new image URL
        db.collection("candidates")
          .doc(currentCandidateId)
          .update({
            name: name,
            position: position,
            bio: bio,
            imageUrl: imageUrl,
          })
          .then(() => {
            alert("Candidate updated successfully!");
            closeEditModal();
            loadCandidates(); // Refresh the candidates list
          })
          .catch((error) => {
            console.error("Error updating candidate:", error);
            alert("Error updating candidate. Please try again.");
          });
      })
      .catch((error) => {
        console.error("Error uploading image:", error);
        alert("Error uploading image. Please try again.");
      });
  } else {
    // Update candidate data without changing the image
    db.collection("candidates")
      .doc(currentCandidateId)
      .update({
        name: name,
        position: position,
        bio: bio,
      })
      .then(() => {
        alert("Candidate updated successfully!");
        closeEditModal();
        loadCandidates(); // Refresh the candidates list
      })
      .catch((error) => {
        console.error("Error updating candidate:", error);
        alert("Error updating candidate. Please try again.");
      });
  }
}); 
// Calculate and Display Winners
function displayWinners() {
  const winnersContainer = document.getElementById("winners-container");
  if (!winnersContainer) {
    console.error("Winners container not found in DOM");
    return; // Prevent further execution if container is missing
  }
  winnersContainer.innerHTML = ""; // Clear previous content

  db.collection("candidates")
    .get()
    .then((querySnapshot) => {
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

      const votePromises = [];

      // Fetch votes for each position and candidate
      for (const position in candidatesByPosition) {
        const positionCandidates = candidatesByPosition[position];
        positionCandidates.forEach((candidate) => {
          votePromises.push(
            db.collection("votes")
              .where("position", "==", position) // Match position
              .where("candidateId", "==", candidate.id) // Match candidateId
              .get()
              .then((voteSnapshot) => ({
                ...candidate,
                votes: voteSnapshot.size,
              }))
          );
        });
      }

      Promise.all(votePromises)
        .then((candidatesWithVotes) => {
          const winnersByPosition = {};

          // Determine winner for each position
          candidatesWithVotes.forEach((candidate) => {
            const position = candidate.position;
            if (
              !winnersByPosition[position] ||
              candidate.votes > winnersByPosition[position].votes
            ) {
              winnersByPosition[position] = candidate;
            }
          });

          // Display winners
          for (const position in winnersByPosition) {
            const winner = winnersByPosition[position];
            const winnerCard = document.createElement("div");
            winnerCard.className = "winner-card";
            winnerCard.innerHTML = `
              <h3>${position}</h3>
              <p>Winner: ${winner.name}</p>
              <p>Votes: ${winner.votes}</p>
              <img src="${winner.imageUrl}" alt="${winner.name}">
            `;
            winnersContainer.appendChild(winnerCard);
          }
        })
        .catch((error) => {
          console.error("Error calculating winners:", error);
          alert("Failed to display winners.");
        });
    })
    .catch((error) => {
      console.error("Error fetching candidates:", error);
      alert("Failed to fetch candidates for winner calculation.");
    });
}
 
// Function to stop the election manually
stopElectionButton.addEventListener("click", () => {
  updateElectionStatus("stopped");
  displayWinners(); // Display winners when election stops
});
