import { createServer } from 'node:http';
import handler from './main.js';

const server = createServer((request, response) => {
  void handler(request, response).catch((error: unknown) => {
    console.error(error);
    if (!response.headersSent) response.statusCode = 500;
    response.end('Internal server error');
  });
});

server.listen(process.env.PORT ?? 3000);
