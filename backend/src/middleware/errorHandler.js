module.exports = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry: a record with this value already exists.' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Foreign key constraint violation: referenced record does not exist.' });
  }

  if (err.code === '23502') {
    return res.status(400).json({ error: `Missing required field: ${err.column}` });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
};
