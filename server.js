const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const uploadsDir = path.join(__dirname, "public", "uploads");
const dataFile = path.join(__dirname, "candidates.json");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify([], null, 2));
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safeName = (req.body.fullName || "candidate").replace(/[^a-zA-Z0-9]/g, "_");
    const ext = path.extname(file.originalname) || "";
    const uniqueName = Date.now() + "_" + safeName + "_" + file.fieldname + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

function readCandidates() {
  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    return JSON.parse(raw || "[]");
  } catch (error) {
    console.error("Read candidates error:", error);
    return [];
  }
}

function saveCandidates(candidates) {
  fs.writeFileSync(dataFile, JSON.stringify(candidates, null, 2));
}

app.post(
  "/save-application",
  upload.fields([
    { name: "idProof", maxCount: 1 },
    { name: "interviewVideo", maxCount: 1 },
    { name: "tenthMarksheet", maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const {
        fullName,
        email,
        phone,
        village,
        age,
        occupation,
        aiScore,
        resultStatus,
        recommendation
      } = req.body;

      const files = req.files || {};

      const idProofFile = files.idProof ? files.idProof[0].filename : "";
      const interviewVideoFile = files.interviewVideo ? files.interviewVideo[0].filename : "";
      const tenthMarksheetFile = files.tenthMarksheet ? files.tenthMarksheet[0].filename : "";

      const candidateData = {
        fullName: fullName || "",
        email: email || "",
        phone: phone || "",
        village: village || "",
        age: age || "",
        occupation: occupation || "",
        aiScore: Number(aiScore || 0),
        resultStatus: resultStatus || "Pending",
        recommendation: recommendation || "",
        idProofFile,
        interviewVideoFile,
        tenthMarksheetFile,
        savedAt: new Date().toLocaleString()
      };

      const candidates = readCandidates();

      const existingIndex = candidates.findIndex(
        c =>
          (c.fullName || "").toLowerCase().trim() === (fullName || "").toLowerCase().trim() &&
          (c.email || "").toLowerCase().trim() === (email || "").toLowerCase().trim()
      );

      if (existingIndex !== -1) {
        candidates[existingIndex] = {
          ...candidates[existingIndex],
          ...candidateData
        };
      } else {
        candidates.push(candidateData);
      }

      saveCandidates(candidates);

      res.json({
        success: true,
        message: "Candidate data saved successfully",
        candidate: candidateData
      });
    } catch (error) {
      console.error("Save application error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while saving application"
      });
    }
  }
);

app.post("/candidate-login", (req, res) => {
  try {
    const { fullName, email } = req.body;

    const candidates = readCandidates();

    const candidate = candidates.find(
      c =>
        (c.fullName || "").toLowerCase().trim() === (fullName || "").toLowerCase().trim() &&
        (c.email || "").toLowerCase().trim() === (email || "").toLowerCase().trim()
    );

    if (!candidate) {
      return res.json({
        success: false,
        message: "Candidate not found"
      });
    }

    res.json({
      success: true,
      candidate
    });
  } catch (error) {
    console.error("Candidate login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

app.get("/all-candidates", (req, res) => {
  try {
    const candidates = readCandidates();
    res.json({
      success: true,
      candidates
    });
  } catch (error) {
    console.error("All candidates error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});