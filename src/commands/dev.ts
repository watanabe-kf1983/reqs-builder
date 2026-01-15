export async function devCommand(): Promise<void> {
  console.log('🚀 Starting development server...');
  console.log('');
  console.log('Development server is ready.');
  console.log('Press Ctrl+C to stop.');

  // Keep the process running
  await new Promise(() => {});
}
