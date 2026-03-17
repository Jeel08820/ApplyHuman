'use strict';

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');

// Use a temporary data directory for tests so we don't pollute real data
const TEST_DATA_DIR = path.join(__dirname, '..', 'data');
const SEEKERS_FILE = path.join(TEST_DATA_DIR, 'seekers.json');
const APPLICATIONS_FILE = path.join(TEST_DATA_DIR, 'applications.json');

function cleanData() {
  if (fs.existsSync(SEEKERS_FILE)) fs.unlinkSync(SEEKERS_FILE);
  if (fs.existsSync(APPLICATIONS_FILE)) fs.unlinkSync(APPLICATIONS_FILE);
}

beforeEach(cleanData);
afterAll(cleanData);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createSeeker(overrides = {}) {
  const defaults = {
    name: 'Jane Doe',
    email: `jane${Date.now()}@example.com`,
    jobTitle: 'Software Engineer',
  };
  const res = await request(app)
    .post('/api/seekers')
    .send({ ...defaults, ...overrides });
  return res;
}

// ── POST /api/seekers ─────────────────────────────────────────────────────────

describe('POST /api/seekers', () => {
  test('creates a seeker with required fields', async () => {
    const res = await createSeeker();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Jane Doe',
      jobTitle: 'Software Engineer',
      status: 'pending',
    });
    expect(res.body.id).toBeTruthy();
    expect(res.body.createdAt).toBeTruthy();
  });

  test('creates a seeker with all optional fields', async () => {
    const res = await createSeeker({
      phone: '+1 555-000-1234',
      linkedinUrl: 'https://linkedin.com/in/janedoe',
      location: 'Remote',
      experienceLevel: 'senior',
      skills: ['JavaScript', 'React'],
      jobTypes: ['full-time', 'contract'],
      targetCompanies: ['Google'],
      resumeText: 'I built things.',
    });
    expect(res.status).toBe(201);
    expect(res.body.phone).toBe('+1 555-000-1234');
    expect(res.body.skills).toEqual(['JavaScript', 'React']);
    expect(res.body.experienceLevel).toBe('senior');
  });

  test('returns 400 when name is missing', async () => {
    const res = await createSeeker({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  test('returns 400 when email is missing', async () => {
    const res = await createSeeker({ email: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  test('returns 400 when jobTitle is missing', async () => {
    const res = await createSeeker({ jobTitle: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/jobTitle/i);
  });

  test('returns 400 for invalid email', async () => {
    const res = await createSeeker({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  test('returns 409 when email already exists', async () => {
    await createSeeker({ email: 'duplicate@example.com' });
    const res = await createSeeker({ email: 'duplicate@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

// ── GET /api/seekers ──────────────────────────────────────────────────────────

describe('GET /api/seekers', () => {
  test('returns empty array when no seekers exist', async () => {
    const res = await request(app).get('/api/seekers');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all seekers', async () => {
    await createSeeker({ email: 'a@example.com' });
    await createSeeker({ email: 'b@example.com' });
    const res = await request(app).get('/api/seekers');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ── GET /api/seekers/:id ──────────────────────────────────────────────────────

describe('GET /api/seekers/:id', () => {
  test('returns the seeker by id', async () => {
    const created = (await createSeeker()).body;
    const res = await request(app).get(`/api/seekers/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/seekers/nonexistent-id');
    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/seekers/:id ────────────────────────────────────────────────────

describe('PATCH /api/seekers/:id', () => {
  test('updates the status of a seeker', async () => {
    const created = (await createSeeker()).body;
    const res = await request(app)
      .patch(`/api/seekers/${created.id}`)
      .send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
  });

  test('updates multiple fields', async () => {
    const created = (await createSeeker()).body;
    const res = await request(app)
      .patch(`/api/seekers/${created.id}`)
      .send({ jobTitle: 'Senior Engineer', location: 'NYC' });
    expect(res.status).toBe(200);
    expect(res.body.jobTitle).toBe('Senior Engineer');
    expect(res.body.location).toBe('NYC');
  });

  test('returns 404 for unknown seeker id', async () => {
    const res = await request(app)
      .patch('/api/seekers/nonexistent-id')
      .send({ status: 'active' });
    expect(res.status).toBe(404);
  });
});

// ── POST /api/applications ────────────────────────────────────────────────────

describe('POST /api/applications', () => {
  test('creates an application for a valid seeker', async () => {
    const seeker = (await createSeeker()).body;
    const res = await request(app)
      .post('/api/applications')
      .send({
        seekerId: seeker.id,
        company: 'Acme Corp',
        jobTitle: 'Frontend Engineer',
        jobUrl: 'https://acme.com/jobs/1',
        notes: 'Applied via careers page',
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      seekerId: seeker.id,
      company: 'Acme Corp',
      jobTitle: 'Frontend Engineer',
      status: 'applied',
    });
    expect(res.body.id).toBeTruthy();
    expect(res.body.appliedAt).toBeTruthy();
  });

  test('returns 400 when seekerId is missing', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({ company: 'Acme', jobTitle: 'Engineer' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/seekerId/i);
  });

  test('returns 400 when company is missing', async () => {
    const seeker = (await createSeeker()).body;
    const res = await request(app)
      .post('/api/applications')
      .send({ seekerId: seeker.id, jobTitle: 'Engineer' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/company/i);
  });

  test('returns 400 when jobTitle is missing', async () => {
    const seeker = (await createSeeker()).body;
    const res = await request(app)
      .post('/api/applications')
      .send({ seekerId: seeker.id, company: 'Acme' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/jobTitle/i);
  });

  test('returns 404 when seeker does not exist', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({ seekerId: 'bad-id', company: 'Acme', jobTitle: 'Engineer' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/seeker/i);
  });
});

// ── GET /api/applications ─────────────────────────────────────────────────────

describe('GET /api/applications', () => {
  test('returns all applications', async () => {
    const seeker = (await createSeeker()).body;
    await request(app).post('/api/applications').send({ seekerId: seeker.id, company: 'A', jobTitle: 'Dev' });
    await request(app).post('/api/applications').send({ seekerId: seeker.id, company: 'B', jobTitle: 'Dev' });

    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters by seekerId', async () => {
    const s1 = (await createSeeker({ email: 's1@example.com' })).body;
    const s2 = (await createSeeker({ email: 's2@example.com' })).body;

    await request(app).post('/api/applications').send({ seekerId: s1.id, company: 'A', jobTitle: 'Dev' });
    await request(app).post('/api/applications').send({ seekerId: s2.id, company: 'B', jobTitle: 'Dev' });

    const res = await request(app).get(`/api/applications?seekerId=${s1.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].seekerId).toBe(s1.id);
  });
});

// ── GET /api/applications/:id ─────────────────────────────────────────────────

describe('GET /api/applications/:id', () => {
  test('returns the application by id', async () => {
    const seeker = (await createSeeker()).body;
    const created = (
      await request(app)
        .post('/api/applications')
        .send({ seekerId: seeker.id, company: 'Acme', jobTitle: 'Dev' })
    ).body;

    const res = await request(app).get(`/api/applications/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
  });

  test('returns 404 for unknown application id', async () => {
    const res = await request(app).get('/api/applications/nonexistent');
    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/applications/:id ───────────────────────────────────────────────

describe('PATCH /api/applications/:id', () => {
  test('updates application status to interview', async () => {
    const seeker = (await createSeeker()).body;
    const app2 = (
      await request(app)
        .post('/api/applications')
        .send({ seekerId: seeker.id, company: 'Acme', jobTitle: 'Dev' })
    ).body;

    const res = await request(app)
      .patch(`/api/applications/${app2.id}`)
      .send({ status: 'interview' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('interview');
  });

  test('updates notes', async () => {
    const seeker = (await createSeeker()).body;
    const app2 = (
      await request(app)
        .post('/api/applications')
        .send({ seekerId: seeker.id, company: 'Acme', jobTitle: 'Dev' })
    ).body;

    const res = await request(app)
      .patch(`/api/applications/${app2.id}`)
      .send({ notes: 'Scheduled for Monday 9am' });
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Scheduled for Monday 9am');
  });

  test('returns 400 for invalid status value', async () => {
    const seeker = (await createSeeker()).body;
    const app2 = (
      await request(app)
        .post('/api/applications')
        .send({ seekerId: seeker.id, company: 'Acme', jobTitle: 'Dev' })
    ).body;

    const res = await request(app)
      .patch(`/api/applications/${app2.id}`)
      .send({ status: 'unknown-status' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/i);
  });

  test('returns 404 for unknown application id', async () => {
    const res = await request(app)
      .patch('/api/applications/nonexistent')
      .send({ status: 'interview' });
    expect(res.status).toBe(404);
  });
});

// ── Static file serving ───────────────────────────────────────────────────────

describe('Static files', () => {
  test('serves landing page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('serves apply.html', async () => {
    const res = await request(app).get('/apply.html');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('serves dashboard.html', async () => {
    const res = await request(app).get('/dashboard.html');
    expect(res.status).toBe(200);
  });

  test('serves admin.html', async () => {
    const res = await request(app).get('/admin.html');
    expect(res.status).toBe(200);
  });

  test('serves styles.css', async () => {
    const res = await request(app).get('/styles.css');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/css/);
  });
});
