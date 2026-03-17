'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);
const SEEKERS_FILE = path.join(DATA_DIR, 'seekers.json');
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// --- Seekers ---
function getSeekers() {
  return readJSON(SEEKERS_FILE);
}

function getSeekerById(id) {
  return getSeekers().find((s) => s.id === id) || null;
}

function getSeekerByEmail(email) {
  return getSeekers().find((s) => s.email === email) || null;
}

function createSeeker(seeker) {
  const seekers = getSeekers();
  seekers.push(seeker);
  writeJSON(SEEKERS_FILE, seekers);
  return seeker;
}

function updateSeeker(id, updates) {
  const seekers = getSeekers();
  const idx = seekers.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  seekers[idx] = { ...seekers[idx], ...updates, updatedAt: new Date().toISOString() };
  writeJSON(SEEKERS_FILE, seekers);
  return seekers[idx];
}

// --- Applications ---
function getApplications(seekerId) {
  const all = readJSON(APPLICATIONS_FILE);
  return seekerId ? all.filter((a) => a.seekerId === seekerId) : all;
}

function getApplicationById(id) {
  return readJSON(APPLICATIONS_FILE).find((a) => a.id === id) || null;
}

function createApplication(application) {
  const applications = readJSON(APPLICATIONS_FILE);
  applications.push(application);
  writeJSON(APPLICATIONS_FILE, applications);
  return application;
}

function updateApplication(id, updates) {
  const applications = readJSON(APPLICATIONS_FILE);
  const idx = applications.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  applications[idx] = { ...applications[idx], ...updates, updatedAt: new Date().toISOString() };
  writeJSON(APPLICATIONS_FILE, applications);
  return applications[idx];
}

module.exports = {
  getSeekers,
  getSeekerById,
  getSeekerByEmail,
  createSeeker,
  updateSeeker,
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
};
