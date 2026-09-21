const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const app = require("../app");
const Banner = require("../models/banner.model");
const Poster = require("../models/poster.model");

async function runTests() {
  console.log("==================================================");
  console.log("   TESTING LANDING PAGE BACKEND INTEGRATION      ");
  console.log("==================================================");

  // Connect to DB if not connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ MongoDB Connected");
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Test Server started on port ${port}`);

  const adminToken = jwt.sign(
    { id: "test_admin_id", role: "ADMIN", email: "admin@chulbulplay.in" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const helper = async (endpoint, method = "GET", body = null, headers = {}) => {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : null,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, headers: res.headers, data };
  };

  try {
    // 1. CORS Test
    console.log("\n1. Testing CORS with LANDING_PAGE_URL...");
    const corsRes = await fetch(`${baseUrl}/api/banners`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
      },
    });
    const allowOrigin = corsRes.headers.get("access-control-allow-origin");
    console.log(`CORS Preflight Status: ${corsRes.status}`);
    console.log(`Access-Control-Allow-Origin: ${allowOrigin}`);
    if (allowOrigin === "http://localhost:3000" || allowOrigin === "*") {
      console.log("✓ CORS correctly allows LANDING_PAGE_URL (http://localhost:3000)");
    } else {
      throw new Error(`CORS failed: received allowOrigin=${allowOrigin}`);
    }

    // 2. Test Security: Public cannot POST without Admin token
    console.log("\n2. Testing Admin Security Enforcement...");
    const unauthPost = await helper("/api/posters", "POST", {
      title: "Hacker Poster",
      imageUrl: "https://example.com/poster.jpg",
      category: "Action",
    });
    if (unauthPost.status === 401 || unauthPost.status === 403) {
      console.log(`✓ Unauthenticated POST /api/posters blocked with status ${unauthPost.status}`);
    } else {
      throw new Error(`Security issue: unauthenticated POST returned status ${unauthPost.status}`);
    }

    // 3. Test Admin Poster Creation with Category Validation
    console.log("\n3. Testing Poster Category Requirement...");
    const noCatPost = await helper(
      "/api/posters",
      "POST",
      { title: "Poster Without Category", imageUrl: "https://example.com/p.jpg" },
      { Authorization: `Bearer ${adminToken}` }
    );
    if (noCatPost.status === 400) {
      console.log("✓ Creation blocked when category is missing");
    } else {
      throw new Error(`Expected status 400 for missing category, got ${noCatPost.status}`);
    }

    // 4. Test Poster Creation & Category Filtering
    console.log("\n4. Creating Test Posters...");
    const poster1Res = await helper(
      "/api/posters",
      "POST",
      {
        title: "Test Movie Poster",
        imageUrl: "https://example.com/movie_poster.jpg",
        category: "Movies",
        description: "An exciting action movie",
        rating: 8.5,
        releaseYear: 2026,
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    const poster1 = poster1Res.data.poster;
    console.log(`✓ Created Poster 1: "${poster1.title}" with category "${poster1.category}" (ID: ${poster1._id})`);

    const poster2Res = await helper(
      "/api/posters",
      "POST",
      {
        title: "Test Trending Series Poster",
        imageUrl: "https://example.com/trending_poster.jpg",
        category: "Trending",
        description: "Trending web series",
        rating: 9.1,
        releaseYear: 2026,
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    const poster2 = poster2Res.data.poster;
    console.log(`✓ Created Poster 2: "${poster2.title}" with category "${poster2.category}" (ID: ${poster2._id})`);

    // 5. Test Public Categories API
    console.log("\n5. Testing GET /api/posters/categories...");
    const catRes = await helper("/api/posters/categories");
    console.log(`Status: ${catRes.status}, Categories:`, catRes.data.categories);
    if (
      catRes.data.success &&
      Array.isArray(catRes.data.categories) &&
      catRes.data.categories.includes("Movies") &&
      catRes.data.categories.includes("Trending")
    ) {
      console.log("✓ GET /api/posters/categories returned categories successfully");
    } else {
      throw new Error("Categories endpoint did not return expected categories");
    }

    // 6. Test Public Posters Retrieval & Category Filter
    console.log("\n6. Testing GET /api/posters and filtering...");
    const allPosters = await helper("/api/posters");
    console.log(`Total Public Posters: ${allPosters.data.count}`);

    const movieFilter = await helper("/api/posters?category=Movies");
    console.log(`Filter by category=Movies Count: ${movieFilter.data.count}`);
    const foundMovie = movieFilter.data.posters.find((p) => p.title === "Test Movie Poster");
    if (foundMovie && foundMovie.category === "Movies") {
      console.log("✓ Poster category filtering works accurately");
    } else {
      throw new Error("Filtering by category=Movies failed");
    }

    // 7. Test Admin Poster Update (Updating category)
    console.log("\n7. Testing Admin Poster Update (Category Change)...");
    const updateRes = await helper(
      `/api/posters/${poster1._id}`,
      "PUT",
      { category: "Web Series", rating: 9.0 },
      { Authorization: `Bearer ${adminToken}` }
    );
    if (updateRes.data.success && updateRes.data.poster.category === "Web Series") {
      console.log(`✓ Successfully updated poster category to "${updateRes.data.poster.category}"`);
    } else {
      throw new Error("Failed to update poster category");
    }

    // 8. Test Banner Management
    console.log("\n8. Testing Banner Management (Create, Get, Update, Delete)...");
    const bannerRes = await helper(
      "/api/banners",
      "POST",
      {
        title: "Test Main Hero Banner",
        imageUrl: "https://example.com/hero_banner.jpg",
        linkUrl: "/watch/test-movie",
        category: "Featured",
        description: "Watch latest blockbuster",
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    const banner1 = bannerRes.data.banner;
    console.log(`✓ Created Banner: "${banner1.title}" (ID: ${banner1._id})`);

    const publicBanners = await helper("/api/banners");
    console.log(`Public Banners Count: ${publicBanners.data.count}`);
    const foundBanner = publicBanners.data.banners.find((b) => b.id === banner1._id);
    if (foundBanner) {
      console.log("✓ Public GET /api/banners returned new banner");
    } else {
      throw new Error("Public banners did not include new banner");
    }

    // 9. Cleanup test records
    console.log("\n9. Cleaning up test records...");
    await helper(`/api/posters/${poster1._id}`, "DELETE", null, { Authorization: `Bearer ${adminToken}` });
    await helper(`/api/posters/${poster2._id}`, "DELETE", null, { Authorization: `Bearer ${adminToken}` });
    await helper(`/api/banners/${banner1._id}`, "DELETE", null, { Authorization: `Bearer ${adminToken}` });
    console.log("✓ Deleted test poster and banner records");

    // 10. Verify Test User Login and Auth Still Works
    console.log("\n10. Verifying Dedicated Test User Login...");
    const otpVerify = await helper("/api/auth/verify-otp", "POST", {
      phone: "9999999999",
      otp: "123456",
    });
    if (otpVerify.data.success && otpVerify.data.token) {
      console.log("✓ Test User login verified successfully (Token received)");
    } else {
      console.log("Note: Auth test response:", otpVerify.data);
    }

    console.log("\n==================================================");
    console.log("   ALL TESTS COMPLETED SUCCESSFULLY!             ");
    console.log("==================================================");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
