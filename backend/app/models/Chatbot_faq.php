<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Chatbot_faq extends Model {

    protected $table = 'chatbot_faqs';

    /**
     * Search for a FAQ by matching keywords or question text.
     * Returns the best matching row or NULL.
     */
    public function search(string $query): ?object
    {
        $query = trim($query);
        $rows  = $this->db->table($this->table)->select('*')->get_all(PDO::FETCH_OBJ);

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
                        $score += 2;
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
     */
    public function get_all(?string $category = null): array
    {
        $builder = $this->db->table($this->table)->select('id, category, question, answer, keywords');

        if ($category) {
            $builder->where('category', $category);
        }

        return $builder->get_all(PDO::FETCH_OBJ) ?: [];
    }

    /**
     * Get all distinct categories.
     */
    public function get_categories(): array
    {
        $rows = $this->db->table($this->table)->select('DISTINCT category')->get_all(PDO::FETCH_OBJ);
        return $rows ?: [];
    }

    /**
     * Tokenize a string into lowercase words (strips punctuation).
     */
    private function tokenize(string $text): array
    {
        $text  = strtolower($text);
        $text  = preg_replace('/[^\w\s]/u', ' ', $text);
        $words = preg_split('/\s+/', $text, -1, PREG_SPLIT_NO_EMPTY);
        $stopWords = ['ang', 'ng', 'sa', 'na', 'at', 'ay', 'ko', 'mo', 'ka',
                      'the', 'is', 'a', 'an', 'of', 'to', 'in', 'how', 'do',
                      'i', 'can', 'what', 'where', 'when', 'why'];
        return array_diff($words, $stopWords);
    }
}
?>
