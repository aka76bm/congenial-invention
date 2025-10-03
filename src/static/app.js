document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search-input");

  let allActivities = {};

  const loginButton = document.getElementById("login-button");
  const loginModal = document.getElementById("login-modal");
  const closeButton = document.querySelector(".close-button");
  const loginForm = document.getElementById("login-form");
  const loginContainer = document.getElementById("login-container");

  // Show/hide login modal
  loginButton.addEventListener("click", () => {
    loginModal.style.display = "block";
  });

  closeButton.addEventListener("click", () => {
    loginModal.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target == loginModal) {
      loginModal.style.display = "none";
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    try {
      const response = await fetch("/token", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        loginModal.style.display = "none";
        showLogoutButton();
        fetchActivities();
      } else {
        alert("Login failed!");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login.");
    }
  });

  // Show logout button
  function showLogoutButton() {
    loginContainer.innerHTML = '<button id="logout-button">Logout</button>';
    document.getElementById("logout-button").addEventListener("click", () => {
      localStorage.removeItem("token");
      loginContainer.innerHTML = '<button id="login-button">Login</button>';
      initializeLoginButton();
      fetchActivities();
    });
  }

  // Initialize login button
  function initializeLoginButton() {
    const loginButton = document.getElementById("login-button");
    loginButton.addEventListener("click", () => {
      loginModal.style.display = "block";
    });
  }

  // Check for token on page load
  if (localStorage.getItem("token")) {
    showLogoutButton();
  }

  // Function to render activities
  function renderActivities(activities) {
    activitiesList.innerHTML = "";

    if (Object.keys(activities).length === 0) {
      activitiesList.innerHTML = "<p>No activities match your search.</p>";
      return;
    }

    Object.entries(activities).forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      const token = localStorage.getItem("token");

      const participantsHTML = 
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${token ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ''}</li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
        ${token ? `<button class="register-btn" data-activity="${name}">Register</button>` : ''}
      `;

      activitiesList.appendChild(activityCard);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    // Add event listeners to register buttons
    document.querySelectorAll(".register-btn").forEach((button) => {
      button.addEventListener("click", handleRegister);
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      allActivities = await response.json();
      renderActivities(allActivities);
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle search input
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredActivities = Object.entries(allActivities).reduce((acc, [name, details]) => {
      if (name.toLowerCase().includes(searchTerm) || details.description.toLowerCase().includes(searchTerm)) {
        acc[name] = details;
      }
      return acc;
    }, {});
    renderActivities(filteredActivities);
  });

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login to unregister.");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities(); // Refresh all activities
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle register functionality
  async function handleRegister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = prompt(`Enter your email to register for ${activity}:`);
    const token = localStorage.getItem("token");

    if (!email) return;

    if (!token) {
      alert("Please login to register.");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities(); // Refresh all activities
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  }

  // Initialize app
  fetchActivities();
});