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

        // Split text into chunks if it's too long
        const maxChunkSize = 4000
        const chunks = text.length <= maxChunkSize ? [text] : splitTextIntoChunks(text, maxChunkSize)

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
                    input: text,
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

            // Stream the audio response directly
            return new Response(response.body, {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                },
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
                'Cache-Control': 'public, max-age=3600',
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
    const chunks: string[] = []
    let currentChunk = ''

    // Split by paragraphs first, then sentences
    const paragraphs = text.split(/\n\s*\n/)

    for (const paragraph of paragraphs) {
        const sentences = paragraph.split(/(?<=[.!?])\s+/)

        for (const sentence of sentences) {
            // If adding this sentence would exceed the limit
            if (currentChunk.length + sentence.length + 1 > maxChunkSize) {
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim())
                    currentChunk = ''
                }

                // If a single sentence is too long, split it by words
                if (sentence.length > maxChunkSize) {
                    const words = sentence.split(' ')
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
                    currentChunk = sentence
                }
            } else {
                currentChunk += (currentChunk ? ' ' : '') + sentence
            }
        }

        // Add paragraph break
        if (currentChunk.trim()) {
            currentChunk += '\n\n'
        }
    }

    // Add the last chunk if it exists
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
    }

    return chunks.filter(chunk => chunk.length > 0)
}