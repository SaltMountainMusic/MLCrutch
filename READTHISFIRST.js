// IMPORTANT!! ALWAYS USE this javascript code to access stored memories, both to read current memories and write new memories to the StoredMemories.json file. You store memories so you can use them later when asked.
//Your memories CONTAIN USEFUL CODE to help answer questions, along with summaries of the code to help you decide which code might be used to answer a question. USE THE CODE, CLAUDE, WHENEVER A QUESTION IS ASKED THAT CAN USE IT!

class MemoryCompression {
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled !== false,
            minSavings: config.minSavings || 10,
            patterns: config.patterns || [
                'function', 'const', 'let', 'var', 'class', 'constructor',
                'return', 'if', 'else', 'for', 'while', 'this.', 'new ',
                'console.log', 'typeof', 'instanceof', 'prototype',
                '    ', '  ', 'true', 'false', 'null', 'undefined',
                'async', 'await', 'try', 'catch', 'throw', 'finally'
            ]
        };
    }

    compress(text) {
        if (text == null) text = '';
        if (typeof text !== 'string') text = String(text);

        if (!this.config.enabled || !text) {
            return {
                text: text,
                dictionary: {},
                originalSize: text.length,
                compressedSize: text.length,
                spaceSaved: 0
            };
        }

        const worthwhilePatterns = this.config.patterns
            .map(pattern => ({
                text: pattern,
                occurrences: (text.split(pattern).length - 1),
                savings: Math.max(0, ((text.split(pattern).length - 1) * (pattern.length - 3)))
            }))
            .filter(p => p.savings >= this.config.minSavings)
            .sort((a, b) => b.savings - a.savings);

        if (worthwhilePatterns.length === 0) {
            return {
                text: text,
                dictionary: {},
                originalSize: text.length,
                compressedSize: text.length,
                spaceSaved: 0
            };
        }

        let compressed = text;
        const dictionary = {};
        let spaceSaved = 0;

        worthwhilePatterns.forEach((pattern, index) => {
            const token = `~${index.toString(36)}`;
            dictionary[token] = pattern.text;
            
            const before = compressed.length;
            compressed = compressed.split(pattern.text).join(token);
            spaceSaved += (before - compressed.length);
        });

        return {
            text: compressed,
            dictionary: dictionary,
            originalSize: text.length,
            compressedSize: compressed.length,
            spaceSaved: spaceSaved
        };
    }

    decompress(compressedText, dictionary) {
        if (!compressedText) return '';
        
        // Handle both formats: inline dictionary and separate dictionary
        let actualCompressedText = compressedText;
        let actualDictionary = dictionary;
        
        // Check if dictionary is embedded inline (format: ~0:value,~1:value|content)
        if (compressedText.includes('|') && compressedText.indexOf('|') > 0) {
            const pipeIndex = compressedText.indexOf('|');
            const dictionaryPart = compressedText.substring(0, pipeIndex);
            actualCompressedText = compressedText.substring(pipeIndex + 1);
            
            // Parse the inline dictionary
            actualDictionary = {};
            const dictEntries = dictionaryPart.split(',');
            for (const entry of dictEntries) {
                const colonIndex = entry.indexOf(':');
                if (colonIndex > 0) {
                    const key = entry.substring(0, colonIndex);
                    const value = entry.substring(colonIndex + 1);
                    actualDictionary[key] = value;
                }
            }
        }

        if (!actualDictionary || Object.keys(actualDictionary).length === 0) {
            return actualCompressedText;
        }

        let result = actualCompressedText;
        
        // Sort tokens by length (longest first) to avoid partial replacements
        const sortedTokens = Object.keys(actualDictionary).sort((a, b) => b.length - a.length);
        
        sortedTokens.forEach(token => {
            const replacement = actualDictionary[token];
            if (replacement != null) {
                result = result.split(token).join(replacement);
            }
        });

        return result;
    }

    // New method to compress with inline dictionary format (like in your memory file)
    compressWithInlineDictionary(text) {
        const result = this.compress(text);
        
        if (Object.keys(result.dictionary).length === 0) {
            return {
                ...result,
                text: result.text // No dictionary to inline
            };
        }

        // Create inline dictionary format: ~0:value,~1:value|compressed_content
        const dictEntries = Object.entries(result.dictionary)
            .map(([key, value]) => `${key}:${value}`)
            .join(',');
        
        const inlineFormat = `${dictEntries}|${result.text}`;
        
        return {
            ...result,
            text: inlineFormat,
            compressedSize: inlineFormat.length
        };
    }

    // Utility method to handle memory file format specifically
    decompressMemoryFileEntry(entry) {
        if (typeof entry === 'string') {
            return this.decompress(entry);
        }
        
        if (entry && typeof entry === 'object') {
            if (entry.value) {
                // Handle the memory file format with compression metadata
                return this.decompress(entry.value, entry.compression?.dictionary);
            }
            if (entry.text && entry.dictionary) {
                // Handle separate text and dictionary
                return this.decompress(entry.text, entry.dictionary);
            }
        }
        
        return entry;
    }
}

function compress(text, options = {}) {
    const compressor = new MemoryCompression(options);
    return compressor.compress(text);
}

function decompress(compressedText, dictionary) {
    const compressor = new MemoryCompression();
    return compressor.decompress(compressedText, dictionary);
}

// New utility functions for the memory file format
function compressWithInlineDictionary(text, options = {}) {
    const compressor = new MemoryCompression(options);
    return compressor.compressWithInlineDictionary(text);
}

function decompressMemoryFileEntry(entry) {
    const compressor = new MemoryCompression();
    return compressor.decompressMemoryFileEntry(entry);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        MemoryCompression, 
        compress, 
        decompress, 
        compressWithInlineDictionary,
        decompressMemoryFileEntry
    };
}

if (typeof window !== 'undefined') {
    window.MemoryCompression = MemoryCompression;
    window.compress = compress;
    window.decompress = decompress;
    window.compressWithInlineDictionary = compressWithInlineDictionary;
    window.decompressMemoryFileEntry = decompressMemoryFileEntry;
}