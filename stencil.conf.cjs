const { spawn } = require('node:child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const watchOptions = {
  files: [
    '/templates',
    '/lang',
    '/.config',
  ],
  ignored: [
    '/assets/css',
    '/assets/js',
    '/assets/dist',
  ],
};

function runVite(args, done) {
  const child = spawn(npmCommand, ['run', ...args], {
    stdio: 'inherit',
  });

  child.on('close', (code) => {
    if (code !== 0) {
      done(new Error(`Vite exited with code ${code}`));
      return;
    }

    done();
  });
}

module.exports = {
  development(browserSync) {
    const child = spawn(npmCommand, ['run', 'dev'], {
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      console.error(error);
    });

    browserSync.watch('assets/dist/**/*').on('change', () => {
      browserSync.reload();
    });

    const stopVite = () => {
      if (!child.killed) {
        child.kill();
      }
    };

    process.once('exit', stopVite);
    process.once('SIGINT', () => {
      stopVite();
      process.exit(0);
    });
    process.once('SIGTERM', () => {
      stopVite();
      process.exit(0);
    });
  },
  production(done) {
    runVite(['build'], done);
  },
  watchOptions,
};
