<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Chatbot_faq extends Model {

    protected $table      = 'chatbot_faqs';
    protected $primaryKey = 'id';

    /**
     * Search for a FAQ by matching keywords or question text.
     * Returns the best matching row or NULL.
     *
     * @param  string $query  The user's message/question
     * @return object|null
     */
    public function search(string $query): ?object
    {
        $query = trim($query);

        // 1. Try to match against stored keywords (comma-separated)
        $rows = $this->db
            ->select('*')
            ->from($this->table)
            ->get()
            ->result();

        $queryWords = $this->tokenize($query);
        $best       = null;
        $bestScore  = 0;

        foreach ($rows as $row) {
            $score = 0;

            // Match against keywords field
            if (!empty($row->keywords)) {
                $rowKeywords = $this->tokenize($row->keywords);
                foreach ($queryWords as $word) {
                    if (in_array($word, $rowKeywords)) {
                        $score += 2; // keyword match = higher weight
                    }
                }
            }

            // Match against question text
            $questionWords = $this->tokenize($row->question);
            foreach ($queryWords as $word) {
                if (in_array($word, $questionWords)) {
                    $score += 1;
                }
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $best      = $row;
            }
        }

        return ($bestScore > 0) ? $best : null;
    }

    /**
     * Get all FAQs, optionally filtered by category.
     *
     * @param  string|null $category
     * @return array
     */
    public function get_all(?string $category = null): array
    {
        $query = $this->db->select('id, category, question, answer, keywords')
                          ->from($this->table);

        if ($category) {
            $query->where('category', $category);
        }

        return $query->get()->result();
    }

    /**
     * Get all distinct categories.
     *
     * @return array
     */
    public function get_categories(): array
    {
        return $this->db
            ->select('DISTINCT category')
            ->from($this->table)
            ->get()
            ->result();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Tokenize a string into lowercase words (strips punctuation).
     */
    private function tokenize(string $text): array
    {
        $text  = strtolower($text);
        $text  = preg_replace('/[^\w\s]/u', ' ', $text);
        $words = preg_split('/\s+/', $text, -1, PREG_SPLIT_NO_EMPTY);
        // Filter very short/common words
        $stopWords = ['ang', 'ng', 'sa', 'na', 'at', 'ay', 'ko', 'mo', 'ka',
                      'the', 'is', 'a', 'an', 'of', 'to', 'in', 'how', 'do',
                      'i', 'can', 'what', 'where', 'when', 'why'];
        return array_diff($words, $stopWords);
    }
}
?>
