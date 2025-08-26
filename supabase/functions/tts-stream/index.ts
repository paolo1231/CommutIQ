import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { text, voice = 'sage', speed = 1.0 } = await req.json()

        if (!text) {
            return new Response(
                JSON.stringify({ error: 'Text parameter is required' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Get OpenAI API key from environment
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiApiKey) {
            return new Response(
                JSON.stringify({ error: 'OpenAI API key not configured' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Split text into chunks if it's too long (OpenAI limit is 4096)
        const maxChunkSize = 4000 // Leave some buffer
        const chunks = splitTextIntoChunks(text, maxChunkSize)

        console.log(`Text length: ${text.length}, Chunks created: ${chunks.length}`)
        if (chunks.length > 1) {
            console.log(`Chunk sizes: ${chunks.map(c => c.length).join(', ')}`)
        }

        // If single chunk, stream directly
        if (chunks.length === 1) {
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: chunks[0], // Use the chunk, not the original text
                    voice: voice,
                    response_format: 'mp3',
                    speed: speed,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                return new Response(
                    JSON.stringify({ error: `TTS API error: ${response.status} - ${errorText}` }),
                    {
                        status: response.status,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    }
                )
            }

            // Get content length if available
            const contentLength = response.headers.get('content-length');

            // Stream the audio response directly with streaming-optimized headers
            const streamHeaders = {
                ...corsHeaders,
                'Content-Type': 'audio/mpeg',
                'Accept-Ranges': 'bytes', // Enable range requests for streaming
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                'Content-Disposition': 'inline', // Allow inline playback
                'X-Content-Type-Options': 'nosniff', // Security header
            };

            // Add content length if available for better streaming
            if (contentLength) {
                streamHeaders['Content-Length'] = contentLength;
            }

            return new Response(response.body, {
                headers: streamHeaders,
            })
        }

        // For multiple chunks, we need to concatenate them
        // Note: This is a simplified approach. For production, you might want to use
        // a more sophisticated audio concatenation method
        const audioChunks: Uint8Array[] = []

        for (const chunk of chunks) {
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: chunk,
                    voice: voice,
                    response_format: 'mp3',
                    speed: speed,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                return new Response(
                    JSON.stringify({ error: `TTS API error: ${response.status} - ${errorText}` }),
                    {
                        status: response.status,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    }
                )
            }

            const audioBuffer = await response.arrayBuffer()
            audioChunks.push(new Uint8Array(audioBuffer))
        }

        // Concatenate audio chunks (simple binary concatenation)
        const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const concatenatedAudio = new Uint8Array(totalLength)
        let offset = 0

        for (const chunk of audioChunks) {
            concatenatedAudio.set(chunk, offset)
            offset += chunk.length
        }

        return new Response(concatenatedAudio, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'audio/mpeg',
                'Accept-Ranges': 'bytes', // Enable range requests for streaming
                'Cache-Control': 'public, max-age=3600',
                'Content-Disposition': 'inline', // Allow inline playback
                'X-Content-Type-Options': 'nosniff', // Security header
            },
        })

    } catch (error) {
        console.error('TTS streaming error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})

function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    // If text is already within limit, return as single chunk
    if (text.length <= maxChunkSize) {
        return [text]
    }

    const chunks: string[] = []
    let currentChunk = ''

    // Split by paragraphs first, then sentences
    const paragraphs = text.split(/\n\s*\n/)

    for (const paragraph of paragraphs) {
        // Try to split by sentences (improved regex for better sentence detection)
        const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph]

        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim()

            // If adding this sentence would exceed the limit
            if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim())
                    currentChunk = ''
                }

                // If a single sentence is too long, split it by words
                if (trimmedSentence.length > maxChunkSize) {
                    const words = trimmedSentence.split(/\s+/)
                    let wordChunk = ''

                    for (const word of words) {
                        if (wordChunk.length + word.length + 1 > maxChunkSize) {
                            if (wordChunk.trim()) {
                                chunks.push(wordChunk.trim())
                            }
                            wordChunk = word
                        } else {
                            wordChunk += (wordChunk ? ' ' : '') + word
                        }
                    }

                    if (wordChunk.trim()) {
                        currentChunk = wordChunk
                    }
                } else {
                    currentChunk = trimmedSentence
                }
            } else {
                currentChunk += (currentChunk ? ' ' : '') + trimmedSentence
            }
        }

        // Add paragraph break if there's content and more paragraphs to come
        if (currentChunk.trim() && paragraphs.indexOf(paragraph) < paragraphs.length - 1) {
            // Check if adding paragraph break would exceed limit
            if (currentChunk.length + 2 > maxChunkSize) {
                chunks.push(currentChunk.trim())
                currentChunk = ''
            } else {
                currentChunk += '\n\n'
            }
        }
    }

    // Add the last chunk if it exists
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
    }

    // Final validation - ensure no chunk exceeds the limit
    const validatedChunks: string[] = []
    for (const chunk of chunks) {
        if (chunk.length > maxChunkSize) {
            // Emergency split by character count
            for (let i = 0; i < chunk.length; i += maxChunkSize) {
                validatedChunks.push(chunk.substring(i, i + maxChunkSize))
            }
        } else {
            validatedChunks.push(chunk)
        }
    }

    return validatedChunks.filter(chunk => chunk.length > 0)
}
