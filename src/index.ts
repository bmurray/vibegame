import { serve } from "bun";
import { file } from "bun";

// Build the game.ts file
const build = await Bun.build({
    entrypoints: ['./src/game.ts'],
    outdir: './dist',
    target: 'browser',
    minify: false,
});

const server = serve({
    port: 3000,
    fetch(req) {
        const url = new URL(req.url);
        
        if (url.pathname === "/") {
            return new Response(file("index.html"));
        }
        
        // Serve bundled JavaScript from dist directory
        if (url.pathname === "/dist/game.js") {
            return new Response(file("dist/game.js"), {
                headers: {
                    "Content-Type": "application/javascript",
                },
            });
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log(`Listening on http://localhost:${server.port}`); 