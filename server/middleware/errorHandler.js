const errorHandler = (err, req, res, _next) => {
  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error('Error caught in errorHandler:', err);
  }
  const statusCode = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;

  const message = err.isOperational && err.message ? err.message : 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    data: null,
    message
  });
};

module.exports = errorHandler;
