const app = require('../src/app');

describe('app bootstrap', () => {
  test('startServer delegates to app.listen and logs startup message', () => {
    const listenSpy = jest.spyOn(app, 'listen').mockImplementation((port, callback) => {
      callback();
      return { close: jest.fn() };
    });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const server = app.startServer(4321);

    expect(listenSpy).toHaveBeenCalledWith(4321, expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith('Task API running on port 4321');
    expect(server).toBeDefined();

    listenSpy.mockRestore();
    logSpy.mockRestore();
  });

  test('startServer uses default port when no argument is provided', () => {
    const expectedPort = process.env.PORT || 3000;
    const listenSpy = jest.spyOn(app, 'listen').mockImplementation((port, callback) => {
      callback();
      return { close: jest.fn() };
    });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    app.startServer();

    expect(listenSpy).toHaveBeenCalledWith(expectedPort, expect.any(Function));

    listenSpy.mockRestore();
    logSpy.mockRestore();
  });
});
