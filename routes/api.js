'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../data/store');

const router = express.Router();

// ── Job Seekers ────────────────────────────────────────────────────────────────

/**
 * POST /api/seekers
 * Register a new job seeker.
 */
router.post('/seekers', (req, res) => {
  const {
    name,
    email,
    phone,
    linkedinUrl,
    jobTitle,
    location,
    experienceLevel,
    skills,
    jobTypes,
    targetCompanies,
    resumeText,
  } = req.body;

  if (!name || !email || !jobTitle) {
    return res.status(400).json({ error: 'name, email, and jobTitle are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (store.getSeekerByEmail(email)) {
    return res.status(409).json({ error: 'A seeker with this email already exists' });
  }

  const seeker = store.createSeeker({
    id: uuidv4(),
    name,
    email,
    phone: phone || '',
    linkedinUrl: linkedinUrl || '',
    jobTitle,
    location: location || '',
    experienceLevel: experienceLevel || 'mid',
    skills: Array.isArray(skills) ? skills : [],
    jobTypes: Array.isArray(jobTypes) ? jobTypes : ['full-time'],
    targetCompanies: Array.isArray(targetCompanies) ? targetCompanies : [],
    resumeText: resumeText || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return res.status(201).json(seeker);
});

/**
 * GET /api/seekers
 * List all job seekers (admin).
 */
router.get('/seekers', (req, res) => {
  return res.json(store.getSeekers());
});

/**
 * GET /api/seekers/:id
 * Get a specific seeker's profile.
 */
router.get('/seekers/:id', (req, res) => {
  const seeker = store.getSeekerById(req.params.id);
  if (!seeker) return res.status(404).json({ error: 'Seeker not found' });
  return res.json(seeker);
});

/**
 * PATCH /api/seekers/:id
 * Update a seeker's status or profile.
 */
router.patch('/seekers/:id', (req, res) => {
  const seeker = store.getSeekerById(req.params.id);
  if (!seeker) return res.status(404).json({ error: 'Seeker not found' });

  const allowedFields = [
    'name',
    'phone',
    'linkedinUrl',
    'jobTitle',
    'location',
    'experienceLevel',
    'skills',
    'jobTypes',
    'targetCompanies',
    'resumeText',
    'status',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const updated = store.updateSeeker(req.params.id, updates);
  return res.json(updated);
});

// ── Applications ───────────────────────────────────────────────────────────────

/**
 * POST /api/applications
 * Log a new job application (performed by the human applier).
 */
router.post('/applications', (req, res) => {
  const { seekerId, company, jobTitle, jobUrl, notes } = req.body;

  if (!seekerId || !company || !jobTitle) {
    return res.status(400).json({ error: 'seekerId, company, and jobTitle are required' });
  }

  const seeker = store.getSeekerById(seekerId);
  if (!seeker) return res.status(404).json({ error: 'Seeker not found' });

  const application = store.createApplication({
    id: uuidv4(),
    seekerId,
    company,
    jobTitle,
    jobUrl: jobUrl || '',
    notes: notes || '',
    status: 'applied',
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return res.status(201).json(application);
});

/**
 * GET /api/applications
 * List applications, optionally filtered by seekerId.
 */
router.get('/applications', (req, res) => {
  const { seekerId } = req.query;
  return res.json(store.getApplications(seekerId));
});

/**
 * GET /api/applications/:id
 * Get a specific application.
 */
router.get('/applications/:id', (req, res) => {
  const application = store.getApplicationById(req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found' });
  return res.json(application);
});

/**
 * PATCH /api/applications/:id
 * Update an application's status (e.g., applied → interview → offer/rejected).
 */
router.patch('/applications/:id', (req, res) => {
  const application = store.getApplicationById(req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found' });

  const validStatuses = ['applied', 'interview', 'offer', 'rejected'];
  const { status, notes } = req.body;

  if (status !== undefined && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const updates = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  const updated = store.updateApplication(req.params.id, updates);
  return res.json(updated);
});

module.exports = router;
