const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
  if (name === 'warning' && data && data.name === 'DeprecationWarning' && data.code === 'DEP0169') {
    return false;
  }
  return originalEmit.apply(process, [name, data, ...args]);
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

export default nextConfig;
