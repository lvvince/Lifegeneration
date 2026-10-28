<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Devotionals extends Controller
{
    /**
     * Curated catalog of youth-focused daily devotionals
     */
    private static $catalog = [
        [
            'reference'     => 'Jeremiah 29:11',
            'verse'         => '“For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future.”',
            'translation'   => 'NIV',
            'title'         => 'God Holds Your Tomorrow',
            'theme'         => 'Purpose & Hope',
            'reflection'    => 'When life feels uncertain or you feel pressured about where your future is heading, remember that God has already walked ahead of you. You do not need to figure out every single step today—just walk closely with the One who holds tomorrow. His heart for you is peace, growth, and hope.',
            'prayer_prompt' => 'Lord, when anxiety tries to overwhelm my future, remind me that Your plans for me are good. I place my tomorrow into Your hands.',
        ],
        [
            'reference'     => 'Philippians 4:6-7',
            'verse'         => 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
            'translation'   => 'NIV',
            'title'         => 'Trading Anxiety for Peace',
            'theme'         => 'Peace & Comfort',
            'reflection'    => 'Anxiety is real, especially with school, career, and life pressures. But God never asked you to carry it alone. Prayer is not just asking for things; it is transferring the heavy weight from your small shoulders onto God’s infinite shoulders. Take a deep breath: God is with you.',
            'prayer_prompt' => 'Father, I release every worry in my heart right now. Guard my thoughts and fill me with Your supernatural peace.',
        ],
        [
            'reference'     => '1 Timothy 4:12',
            'verse'         => 'Don’t let anyone look down on you because you are young, but set an example for the believers in speech, in conduct, in love, in faith and in purity.',
            'translation'   => 'NIV',
            'title'         => 'You Are Never Too Young to Inspire',
            'theme'         => 'Youth Leadership',
            'reflection'    => 'You don’t need a title, a decade of experience, or thousands of followers to make an impact for Jesus. Your kindness in school, your integrity when nobody is looking, and your genuine love for your peers are powerful testimonies. God uses young people to ignite communities.',
            'prayer_prompt' => 'Jesus, use my words, my actions, and my life today to point my friends and family closer to You.',
        ],
        [
            'reference'     => 'Joshua 1:9',
            'verse'         => 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.',
            'translation'   => 'NIV',
            'title'         => 'Courage Over Fear',
            'theme'         => 'Courage',
            'reflection'    => 'Courage isn’t the absence of fear—it is choosing to obey and trust God in spite of fear. Whatever giant, difficult conversation, or daunting task is standing before you today, know that the Almighty Creator of the universe is walking right beside you.',
            'prayer_prompt' => 'Lord, grant me boldness today to do what is right and to stand firm in my faith without fear.',
        ],
        [
            'reference'     => 'Proverbs 3:5-6',
            'verse'         => 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
            'translation'   => 'NIV',
            'title'         => 'Leaning Into God’s Guidance',
            'theme'         => 'Wisdom & Trust',
            'reflection'    => 'We often want the full GPS route before taking the first step. But God usually gives us a flashlight for the next step. When you surrender your decisions, big and small, to Him in prayer, He promises to direct your path.',
            'prayer_prompt' => 'Holy Spirit, direct my steps today. Give me the humility to trust Your wisdom above my own feelings.',
        ],
        [
            'reference'     => 'Isaiah 40:31',
            'verse'         => 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.',
            'translation'   => 'NIV',
            'title'         => 'Renewed When You Are Tired',
            'theme'         => 'Strength & Rest',
            'reflection'    => 'It is okay to feel tired, but don’t quit. Rest in God’s presence. When your own battery runs out, tap into His unlimited power. The same God who sustains galaxies is ready to breathe fresh joy and vitality into your soul right now.',
            'prayer_prompt' => 'Lord, I feel drained today. Renew my energy, refresh my spirit, and teach me how to find true rest in You.',
        ],
        [
            'reference'     => 'Romans 8:38-39',
            'verse'         => 'For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers... will be able to separate us from the love of God that is in Christ Jesus our Lord.',
            'translation'   => 'NIV',
            'title'         => 'Unshakable, Unconditional Love',
            'theme'         => 'Identity in Christ',
            'reflection'    => 'No failure, no mistake, no rejection from peers, and no bad day can ever make God love you less. Your worth is anchored in the cross, not in your performance. Walk with confidence today knowing that you are deeply and eternally cherished.',
            'prayer_prompt' => 'Thank You Jesus for loving me unconditionally. Let Your love heal every insecurity in my heart.',
        ],
        [
            'reference'     => 'Colossians 3:23',
            'verse'         => 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
            'translation'   => 'NIV',
            'title'         => 'Doing It All for Jesus',
            'theme'         => 'Excellence & Ministry',
            'reflection'    => 'Whether studying for an exam, doing household chores, serving in worship ministry, or clocking into work: do it with passion and excellence because Jesus is your ultimate Audience of One.',
            'prayer_prompt' => 'Father, transform my daily routine into an act of worship. May whatever my hands find to do bring honor to Your name.',
        ],
        [
            'reference'     => 'Psalm 139:14',
            'verse'         => 'I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.',
            'translation'   => 'NIV',
            'title'         => 'Wonderfully Designed',
            'theme'         => 'Self-Worth',
            'reflection'    => 'In a world of filters and comparison on social media, never forget that you are an original masterpiece created on purpose, for a purpose. God made no mistakes when He designed your gifts, your heart, and your smile.',
            'prayer_prompt' => 'Lord, help me see myself through Your eyes of grace, love, and purpose.',
        ],
        [
            'reference'     => 'Matthew 5:14-16',
            'verse'         => 'You are the light of the world. A town built on a hill cannot be hidden... let your light shine before others, that they may see your good deeds and glorify your Father in heaven.',
            'translation'   => 'NIV',
            'title'         => 'Shine Your Light Today',
            'theme'         => 'Witnessing',
            'reflection'    => 'Even the smallest candle shatters absolute darkness. A kind compliment, an encouraging message, listening to a hurting friend, or inviting someone to youth gathering can change someone’s entire week. Be the light.',
            'prayer_prompt' => 'Jesus, shine through me today. Open my eyes to notice people around me who need encouragement.',
        ],
        [
            'reference'     => 'Galatians 6:9',
            'verse'         => 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.',
            'translation'   => 'NIV',
            'title'         => 'Don’t Give Up on Doing Good',
            'theme'         => 'Perseverance',
            'reflection'    => 'Sometimes serving, praying for someone, or doing the right thing feels thankless. But heaven sees every seed you sow. Keep loving, keep forgiving, keep serving—a bountiful spiritual harvest is on its way.',
            'prayer_prompt' => 'Holy Spirit, give me endurance to keep doing good even when I feel unnoticed or unappreciated.',
        ],
        [
            'reference'     => '2 Corinthians 5:17',
            'verse'         => 'Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!',
            'translation'   => 'NIV',
            'title'         => 'A Fresh Beginning Every Morning',
            'theme'         => 'Grace & Renewal',
            'reflection'    => 'Your past does not define your future. In Christ Jesus, today is a clean slate. Whatever regrets you held yesterday, leave them at the foot of the cross. Step into the joy of God’s fresh grace today.',
            'prayer_prompt' => 'Thank You, Lord, that Your mercies are brand new every morning. Help me walk in freedom and victory today.',
        ]
    ];

    /**
     * Get Today's Devotional
     * GET /api/devotional/today
     */
    public function today()
    {
        $dayOfYear = (int) date('z'); // 0 to 365
        $count = count(self::$catalog);
        $index = $dayOfYear % $count;
        $item = self::$catalog[$index];

        $todayDate = date('Y-m-d');
        $item['date'] = $todayDate;
        $item['formatted_date'] = date('l, F j, Y');
        $item['reading_time'] = '1 min read';
        $item['total_catalog'] = $count;
        $item['day_of_year'] = $dayOfYear + 1;

        api_response($item);
    }

    /**
     * Get Random or Alternate Devotional
     * GET /api/devotional/random
     */
    public function random()
    {
        $count = count(self::$catalog);
        $randIndex = array_rand(self::$catalog);
        $item = self::$catalog[$randIndex];

        $item['date'] = date('Y-m-d');
        $item['formatted_date'] = date('l, F j, Y');
        $item['reading_time'] = '1 min read';

        api_response($item);
    }
}

