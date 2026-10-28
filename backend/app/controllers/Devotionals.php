<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Devotionals extends Controller
{
    /**
     * Curated catalog of youth-focused daily devotionals (Bilingual: English & Tagalog)
     */
    private static $catalog = [
        [
            'reference'        => 'Jeremiah 29:11',
            'verse'            => '“For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future.”',
            'translation'      => 'NIV',
            'title'            => 'God Holds Your Tomorrow',
            'theme'            => 'Purpose & Hope',
            'reflection'       => 'When life feels uncertain or you feel pressured about where your future is heading, remember that God has already walked ahead of you. You do not need to figure out every single step today—just walk closely with the One who holds tomorrow. His heart for you is peace, growth, and hope.',
            'prayer_prompt'    => 'Lord, when anxiety tries to overwhelm my future, remind me that Your plans for me are good. I place my tomorrow into Your hands.',
            'reference_tl'     => 'Jeremias 29:11',
            'verse_tl'         => '“Sapagkat batid kong lubos ang mga plano ko para sa inyo; mga planong hindi ninyo ikakasama kundi para sa inyong ikabubuti. Ito’y mga planong magdudulot sa inyo ng pag-asa at magandang kinabukasan.”',
            'title_tl'         => 'Hawak ng Diyos ang Iyong Bukas',
            'theme_tl'         => 'Layunin at Pag-asa',
            'reflection_tl'    => 'Kapag parang hindi sigurado ang bukas at nakakaramdam ka ng bigat sa iyong kinabukasan, tandaan mong nauna nang lumakad ang Diyos para sa iyo. Hindi mo kailangang lutasin ang lahat ngayon—lumakad ka lang kasama Siya. Ang nais Niya para sa iyo ay kapayapaan, pag-unlad, at pag-asa.',
            'prayer_prompt_tl' => 'Panginoon, kapag pinangungunahan ako ng takot sa aking kinabukasan, ipaalala Mo na mabuti ang Iyong mga plano. Ipinagkakatiwala ko ang aking bukas sa Iyong mga kamay.',
        ],
        [
            'reference'        => 'Philippians 4:6-7',
            'verse'            => 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
            'translation'      => 'NIV',
            'title'            => 'Trading Anxiety for Peace',
            'theme'            => 'Peace & Comfort',
            'reflection'       => 'Anxiety is real, especially with school, career, and life pressures. But God never asked you to carry it alone. Prayer is not just asking for things; it is transferring the heavy weight from your small shoulders onto God’s infinite shoulders. Take a deep breath: God is with you.',
            'prayer_prompt'    => 'Father, I release every worry in my heart right now. Guard my thoughts and fill me with Your supernatural peace.',
            'reference_tl'     => 'Filipos 4:6-7',
            'verse_tl'         => 'Huwag kayong mabalisa tungkol sa anumang bagay. Sa halip, hingin ninyo sa Diyos ang lahat ng inyong kailangan sa pamamagitan ng panalanging may pasasalamat. At ang kapayapaan ng Diyos na hindi kayang abutin ng pag-iisip ng tao ang mag-iingat sa inyong puso at pag-iisip dahil kay Cristo Jesus.',
            'title_tl'         => 'Kapayapaan sa Gitna ng Pangamba',
            'theme_tl'         => 'Kapayapaan at Kaginhawahan',
            'reflection_tl'    => 'Totoo ang pag-aalala, lalo na sa pag-aaral, trabaho, at buhay. Ngunit hindi nais ng Diyos na buhatin mo ito nang mag-isa. Ang panalangin ay paglilipat ng mabigat mong pasanin patungo sa mga makapangyarihang balikat ng Diyos. Huminga nang malalim: Kasama mo ang Diyos.',
            'prayer_prompt_tl' => 'Ama, inilalapag ko po sa paanan Mo ang bawat kaba at pag-aalala. Bantayan Mo po ang aking isip at punuin Mo ako ng Iyong kapayapaan.',
        ],
        [
            'reference'        => '1 Timothy 4:12',
            'verse'            => 'Don’t let anyone look down on you because you are young, but set an example for the believers in speech, in conduct, in love, in faith and in purity.',
            'translation'      => 'NIV',
            'title'            => 'You Are Never Too Young to Inspire',
            'theme'            => 'Youth Leadership',
            'reflection'       => 'You don’t need a title, a decade of experience, or thousands of followers to make an impact for Jesus. Your kindness in school, your integrity when nobody is looking, and your genuine love for your peers are powerful testimonies. God uses young people to ignite communities.',
            'prayer_prompt'    => 'Jesus, use my words, my actions, and my life today to point my friends and family closer to You.',
            'reference_tl'     => '1 Timoteo 4:12',
            'verse_tl'         => 'Huwag mong hayaang hamakin ka ninuman dahil sa iyong kabataan. Sa halip, maging huwaran ka sa mga mananampalataya sa iyong pananalita, ugali, pag-ibig, pananampalataya, at kalinisan.',
            'title_tl'         => 'Hindi Ka Masyadong Bata Para Magbigay-Inspirasyon',
            'theme_tl'         => 'Kabataang Lider',
            'reflection_tl'    => 'Hindi mo kailangan ng posisyon o libu-libong tagasunod upang maging patotoo kay Jesus. Ang iyong kabutihan sa eskwelahan, katapatan kahit walang nakatingin, at tapat na pagmamalasakit sa kapwa ay may malaking epekto. Ginagamit ng Diyos ang kabataan upang magpasiklab ng pagbabago.',
            'prayer_prompt_tl' => 'Jesus, gamitin Mo po ang aking mga salita, kilos, at buhay ngayon upang ilapit ang aking mga kaibigan sa Iyo.',
        ],
        [
            'reference'        => 'Joshua 1:9',
            'verse'            => 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.',
            'translation'      => 'NIV',
            'title'            => 'Courage Over Fear',
            'theme'            => 'Courage',
            'reflection'       => 'Courage isn’t the absence of fear—it is choosing to obey and trust God in spite of fear. Whatever giant, difficult conversation, or daunting task is standing before you today, know that the Almighty Creator of the universe is walking right beside you.',
            'prayer_prompt'    => 'Lord, grant me boldness today to do what is right and to stand firm in my faith without fear.',
            'reference_tl'     => 'Josue 1:9',
            'verse_tl'         => 'Tandaan mo ang tagubilin ko: Magpakatatag ka at lakasan mo ang iyong loob! Huwag kang matakot o panghinaan ng loob, sapagkat akong si Yahweh na iyong Diyos ay sasaiyo saan ka man magpunta.',
            'title_tl'         => 'Lakas ng Loob Laban sa Takot',
            'theme_tl'         => 'Katapangan',
            'reflection_tl'    => 'Ang lakas ng loob ay hindi kawalan ng takot—ito ay ang pagpiling sumunod at magtiwala sa Diyos sa kabila ng takot. Anumang pagsubok, mahirap na sitwasyon, o takot ang kinakaharap mo ngayon, kasama mo ang Maylalang ng buong sansinukob.',
            'prayer_prompt_tl' => 'Panginoon, bigyan Mo po ako ng katapangan na gawin ang tama at manindigan sa aking pananampalataya nang walang pag-aalinlangan.',
        ],
        [
            'reference'        => 'Proverbs 3:5-6',
            'verse'            => 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
            'translation'      => 'NIV',
            'title'            => 'Leaning Into God’s Guidance',
            'theme'            => 'Wisdom & Trust',
            'reflection'       => 'We often want the full GPS route before taking the first step. But God usually gives us a flashlight for the next step. When you surrender your decisions, big and small, to Him in prayer, He promises to direct your path.',
            'prayer_prompt'    => 'Holy Spirit, direct my steps today. Give me the humility to trust Your wisdom above my own feelings.',
            'reference_tl'     => 'Mga Kawikaan 3:5-6',
            'verse_tl'         => 'Kay Yahweh ka magtiwala nang buong puso mo, at huwag kang manalig sa sarili mong karunungan. Sa lahat ng iyong lakad Siya nga ay kilalanin mo, at Kanyang itutuwid ang iyong mga landas.',
            'title_tl'         => 'Magtiwala sa Patnubay ng Diyos',
            'theme_tl'         => 'Karunungan at Pagtitiwala',
            'reflection_tl'    => 'Kadalasan gusto nating makita agad ang buong mapa bago humakbang. Ngunit flashlight lamang ang ibinibigay ng Diyos para sa susunod na hakbang. Kapag ipinagkatiwala mo ang iyong mga desisyon sa Kanya, nangangako Siyang itutuwid ang iyong daan.',
            'prayer_prompt_tl' => 'Banal na Espiritu, patnubayan Mo po ang bawat hakbang ko ngayon. Bigyan Mo ako ng kababaang-loob na magtiwala sa Iyong plano higit sa aking sariling damdamin.',
        ],
        [
            'reference'        => 'Isaiah 40:31',
            'verse'            => 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.',
            'translation'      => 'NIV',
            'title'            => 'Renewed When You Are Tired',
            'theme'            => 'Strength & Rest',
            'reflection'       => 'It is okay to feel tired, but don’t quit. Rest in God’s presence. When your own battery runs out, tap into His unlimited power. The same God who sustains galaxies is ready to breathe fresh joy and vitality into your soul right now.',
            'prayer_prompt'    => 'Lord, I feel drained today. Renew my energy, refresh my spirit, and teach me how to find true rest in You.',
            'reference_tl'     => 'Isaias 40:31',
            'verse_tl'         => 'Ngunit silang nagtitiwala kay Yahweh ay muling magkakaroon ng lakas. Sila’y lilipad na tulad ng mga agila; tatakbo sila ngunit hindi mapapagod, lalakad sila ngunit hindi manghihina.',
            'title_tl'         => 'Bagong Lakas sa Gitna ng Pagod',
            'theme_tl'         => 'Lakas at Pahinga',
            'reflection_tl'    => 'Ayos lang mapagod, ngunit huwag kang susuko. Magpahinga ka sa presensya ng Panginoon. Kapag naubos ang sarili mong baterya, lumapit ka sa Kanyang walang hanggang kapangyarihan. Handa Siyang magbigay ng bagong sigla sa iyong kaluluwa.',
            'prayer_prompt_tl' => 'Panginoon, nararamdaman ko po ang pagod ngayon. Ipanumbalik Mo ang aking lakas at turuan Mo akong magpahinga nang tunay sa Iyo.',
        ],
        [
            'reference'        => 'Romans 8:38-39',
            'verse'            => 'For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers... will be able to separate us from the love of God that is in Christ Jesus our Lord.',
            'translation'      => 'NIV',
            'title'            => 'Unshakable, Unconditional Love',
            'theme'            => 'Identity in Christ',
            'reflection'       => 'No failure, no mistake, no rejection from peers, and no bad day can ever make God love you less. Your worth is anchored in the cross, not in your performance. Walk with confidence today knowing that you are deeply and eternally cherished.',
            'prayer_prompt'    => 'Thank You Jesus for loving me unconditionally. Let Your love heal every insecurity in my heart.',
            'reference_tl'     => 'Roma 8:38-39',
            'verse_tl'         => 'Sapagkat natitiyak kong walang makapaghihiwalay sa atin sa kanyang pag-ibig—kahit ang kamatayan o ang buhay, ang mga anghel o ang mga pamunuan, ang kasalukuyan o ang hinaharap... ay hindi makapaghihiwalay sa atin sa pag-ibig ng Diyos kay Cristo Jesus na ating Panginoon.',
            'title_tl'         => 'Wagas at Walang Pasubaling Pag-ibig',
            'theme_tl'         => 'Katapatan ng Diyos',
            'reflection_tl'    => 'Walang pagkakamali, kabiguan, o masamang araw ang makakabawas sa pagmamahal ng Diyos sa iyo. Ang halaga mo ay nakatatak sa krus at hindi sa iyong mga nagawa. Lumakad nang may kumpiyansa ngayong araw dahil labis kang minamahal ng Diyos.',
            'prayer_prompt_tl' => 'Salamat Jesus sa Iyong walang hanggang pag-ibig. Nawa’y hilumin ng pag-ibig Mo ang bawat pagdududa sa aking puso.',
        ],
        [
            'reference'        => 'Colossians 3:23',
            'verse'            => 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
            'translation'      => 'NIV',
            'title'            => 'Doing It All for Jesus',
            'theme'            => 'Excellence & Ministry',
            'reflection'       => 'Whether studying for an exam, doing household chores, serving in worship ministry, or clocking into work: do it with passion and excellence because Jesus is your ultimate Audience of One.',
            'prayer_prompt'    => 'Father, transform my daily routine into an act of worship. May whatever my hands find to do bring honor to Your name.',
            'reference_tl'     => 'Colosas 3:23',
            'verse_tl'         => 'Anuman ang inyong ginagawa, gawin ninyo ito nang buong puso tulad ng paglilingkod sa Panginoon at hindi sa mga tao.',
            'title_tl'         => 'Ialay ang Lahat Para kay Jesus',
            'theme_tl'         => 'Kahusayan sa Buhay',
            'reflection_tl'    => 'Nag-aaral ka man para sa pagsusulit, gumagawa ng gawaing-bahay, naglilingkod sa ministry, o nagtatrabaho: gawin ito nang may puso at husay dahil si Jesus ang tunay mong pinaglilingkuran.',
            'prayer_prompt_tl' => 'Ama, gawin Mong handog ng pagsamba ang aking pang-araw-araw na gawain. Nawa’y magbigay-puri sa Iyo ang bawat pagkilos ko.',
        ],
        [
            'reference'        => 'Psalm 139:14',
            'verse'            => 'I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.',
            'translation'      => 'NIV',
            'title'            => 'Wonderfully Designed',
            'theme'            => 'Self-Worth',
            'reflection'       => 'In a world of filters and comparison on social media, never forget that you are an original masterpiece created on purpose, for a purpose. God made no mistakes when He designed your gifts, your heart, and your smile.',
            'prayer_prompt'    => 'Lord, help me see myself through Your eyes of grace, love, and purpose.',
            'reference_tl'     => 'Mga Awit 139:14',
            'verse_tl'         => 'Pinupuri kita sapagkat ako’y kakila-kilabot at kamangha-manghang nilikha; kamangha-mangha ang iyong mga gawa, at alam na alam iyon ng aking kaluluwa.',
            'title_tl'         => 'Kamangha-manghang Nilikha',
            'theme_tl'         => 'Halaga sa Diyos',
            'reflection_tl'    => 'Sa mundong puno ng filters at pagkukumpara sa social media, huwag mong kalilimutan na ikaw ay obra maestra ng Diyos. May layunin ang bawat talino, puso, at katangian na ibinigay Niya sa iyo.',
            'prayer_prompt_tl' => 'Panginoon, tulungan Mo akong makita ang aking sarili ayon sa Iyong pag-ibig, biyaya, at layunin.',
        ],
        [
            'reference'        => 'Matthew 5:14-16',
            'verse'            => 'You are the light of the world. A town built on a hill cannot be hidden... let your light shine before others, that they may see your good deeds and glorify your Father in heaven.',
            'translation'      => 'NIV',
            'title'            => 'Shine Your Light Today',
            'theme'            => 'Witnessing',
            'reflection'       => 'Even the smallest candle shatters absolute darkness. A kind compliment, an encouraging message, listening to a hurting friend, or inviting someone to youth gathering can change someone’s entire week. Be the light.',
            'prayer_prompt'    => 'Jesus, shine through me today. Open my eyes to notice people around me who need encouragement.',
            'reference_tl'     => 'Mateo 5:14-16',
            'verse_tl'         => 'Kayo ang ilaw ng sanlibutan. Ang isang lungsod na nakatayo sa ibabaw ng burol ay hindi maitatago... paliwanagin ninyo ang inyong ilaw sa harap ng mga tao, upang makita nila ang inyong mabubuting gawa at purihin ang inyong Ama na nasa langit.',
            'title_tl'         => 'Maging Ilaw Ngayong Araw',
            'theme_tl'         => 'Pagiging Patotoo',
            'reflection_tl'    => 'Kahit ang pinakamaliit na kandila ay nagtataboy ng kadiliman. Isang simpleng papuri, mensahe ng suporta, pakikinig sa nahihirapang kaibigan, o pag-imbita sa youth service ay makakapagpabago ng araw ng iba. Maging ilaw ka ngayon.',
            'prayer_prompt_tl' => 'Jesus, magliwanag Ka sa buhay ko ngayon. Buksan Mo ang aking mga mata upang makita ang mga taong nangangailangan ng Iyong pag-asa.',
        ],
        [
            'reference'        => 'Galatians 6:9',
            'verse'            => 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.',
            'translation'      => 'NIV',
            'title'            => 'Don’t Give Up on Doing Good',
            'theme'            => 'Perseverance',
            'reflection'       => 'Sometimes serving, praying for someone, or doing the right thing feels thankless. But heaven sees every seed you sow. Keep loving, keep forgiving, keep serving—a bountiful spiritual harvest is on its way.',
            'prayer_prompt'    => 'Holy Spirit, give me endurance to keep doing good even when I feel unnoticed or unappreciated.',
            'reference_tl'     => 'Galacia 6:9',
            'verse_tl'         => 'Kaya\'t huwag tayong magsawa sa paggawa ng mabuti, sapagkat sa takdang panahon ay aani tayo kung hindi tayo susuko.',
            'title_tl'         => 'Huwag Magsawa sa Paggawa ng Mabuti',
            'theme_tl'         => 'Pagtitiyaga',
            'reflection_tl'    => 'Kung minsan parang walang nakapapansin sa iyong pagtulong, pagdarasal, o paggawa ng tama. Ngunit nakikita ng langit ang bawat butil ng kabutihang iyong itinatanim. Patuloy na magmahal, magpatawad, at maglingkod—may magandang aning darating.',
            'prayer_prompt_tl' => 'Banal na Espiritu, pagkalooban Mo po ako ng tibay ng loob upang magpatuloy sa kabutihan kahit walang nakakapansin.',
        ],
        [
            'reference'        => '2 Corinthians 5:17',
            'verse'            => 'Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!',
            'translation'      => 'NIV',
            'title'            => 'A Fresh Beginning Every Morning',
            'theme'            => 'Grace & Renewal',
            'reflection'       => 'Your past does not define your future. In Christ Jesus, today is a clean slate. Whatever regrets you held yesterday, leave them at the foot of the cross. Step into the joy of God’s fresh grace today.',
            'prayer_prompt'    => 'Thank You, Lord, that Your mercies are brand new every morning. Help me walk in freedom and victory today.',
            'reference_tl'     => '2 Corinto 5:17',
            'verse_tl'         => 'Kaya\'t kung ang sinuman ay na kay Cristo, siya ay isa nang bagong nilalang; lumipas na ang mga lumang bagay, masdan ninyo, ang lahat ay naging bago!',
            'title_tl'         => 'Bagong Simula Bawat Umaga',
            'theme_tl'         => 'Biyaya at Pagbabago',
            'reflection_tl'    => 'Hindi ang iyong nakaraan ang nagtatakda ng iyong hinaharap. Kay Cristo Jesus, panibagong pagkakataon ang bawat araw. Anumang lungkot o pagsisisi kahapon, ilatag mo sa paanan ng krus. Humakbang sa kagalakan ng biyaya ng Diyos ngayon.',
            'prayer_prompt_tl' => 'Salamat, Panginoon, dahil bago ang Iyong habag tuwing umaga. Tulungan Mo po akong lumakad nang may kalayaan at tagumpay ngayon.',
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

    /**
     * Live Bible Search & Passage Lookup
     * Supports:
     *  - 'tl' / 'mbbtag' / 'tagalog' -> Tagalog (Magandang Balita Biblia / Ang Dating Biblia)
     *  - 'niv' -> New International Version
     *  - 'nkjv' -> New King James Version
     *  - 'kjv' -> King James Version
     *  - 'web' -> World English Bible (Modern)
     *
     * GET /api/bible/lookup?q=John+3:16&translation=tl
     */
    public function lookup()
    {
        $query = trim($_GET['q'] ?? $_GET['passage'] ?? $_GET['query'] ?? '');
        $translation = strtolower(trim($_GET['translation'] ?? 'niv'));

        if (empty($query)) {
            api_response(['error' => 'Please provide a scripture reference to search (e.g. John 3:16, Psalm 23, Juan 3:16).'], 422);
        }

        // Translation metadata map
        $transMap = [
            'tl'      => ['gateway' => 'MBBTAG', 'name' => 'Tagalog (Magandang Balita Biblia)'],
            'tagalog' => ['gateway' => 'MBBTAG', 'name' => 'Tagalog (Magandang Balita Biblia)'],
            'mbbtag'  => ['gateway' => 'MBBTAG', 'name' => 'Tagalog (Magandang Balita Biblia)'],
            'tlab'    => ['gateway' => 'TAG',    'name' => 'Tagalog (Ang Dating Biblia 1905)'],
            'niv'     => ['gateway' => 'NIV',    'name' => 'New International Version (NIV)'],
            'nkjv'    => ['gateway' => 'NKJV',   'name' => 'New King James Version (NKJV)'],
            'kjv'     => ['gateway' => 'KJV',    'name' => 'King James Version (KJV)'],
            'web'     => ['gateway' => 'WEB',    'name' => 'World English Bible (WEB)'],
            'bbe'     => ['gateway' => 'BBE',    'name' => 'Bible in Basic English (BBE)'],
        ];

        $targetKey = isset($transMap[$translation]) ? $translation : 'niv';
        $meta = $transMap[$targetKey];
        $gatewayCode = $meta['gateway'];
        $transName = $meta['name'];

        // 1. Try BibleGateway (Supports NIV, NKJV, MBBTAG, TAG, KJV)
        $scraped = $this->fetchFromBibleGateway($query, $gatewayCode);
        if ($scraped && !empty($scraped['text'])) {
            api_response([
                'success'          => true,
                'reference'        => $scraped['reference'] ?: $query,
                'text'             => $scraped['text'],
                'translation_id'   => $targetKey,
                'translation_name' => $transName,
                'source'           => 'BibleGateway',
            ]);
        }

        // 2. If Tagalog and BibleGateway was unavailable, try HelloAO API (Official Tagalog Open API)
        if (in_array($targetKey, ['tl', 'tagalog', 'mbbtag', 'tlab'])) {
            $helloAo = $this->fetchHelloAoTagalog($query);
            if ($helloAo && !empty($helloAo['text'])) {
                api_response([
                    'success'          => true,
                    'reference'        => $helloAo['reference'] ?: $query,
                    'text'             => $helloAo['text'],
                    'translation_id'   => 'tl',
                    'translation_name' => 'Tagalog (Banal na Bibliya - ULB)',
                    'source'           => 'HelloAO',
                ]);
            }
        }

        // 3. If English/KJV/WEB, fallback to bible-api.com
        $bibleApiTrans = ($targetKey === 'kjv') ? 'kjv' : (($targetKey === 'bbe') ? 'bbe' : 'web');
        $fallback = $this->fetchFromBibleApi($query, $bibleApiTrans);
        if ($fallback && !empty($fallback['text'])) {
            api_response([
                'success'          => true,
                'reference'        => $fallback['reference'] ?: $query,
                'text'             => $fallback['text'],
                'translation_id'   => $targetKey,
                'translation_name' => $transName . ' (Fallback: ' . strtoupper($bibleApiTrans) . ')',
                'source'           => 'BibleApi',
            ]);
        }

        api_response([
            'error' => "Scripture reference \"{$query}\" could not be found. Please check spelling or try format like \"John 3:16\", \"Awit 23\", or \"Romans 8:28\"."
        ], 404);
    }

    /**
     * Scrape passage from BibleGateway
     */
    private function fetchFromBibleGateway($query, $version)
    {
        $url = 'https://www.biblegateway.com/passage/?search=' . urlencode($query) . '&version=' . urlencode($version);
        $ctx = stream_context_create([
            'http' => [
                'timeout' => 8,
                'header'  => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n"
            ]
        ]);

        $html = @file_get_contents($url, false, $ctx);
        if (!$html) return null;

        $pos = strpos($html, 'class="passage-text"');
        if ($pos === false) return null;

        $tagClose = strpos($html, '>', $pos);
        if ($tagClose !== false) {
            $pos = $tagClose + 1;
        }

        $end = strpos($html, 'publisher-info-bottom', $pos);
        $snippet = ($end !== false) ? substr($html, $pos, $end - $pos) : substr($html, $pos, 4000);

        // Strip footnotes, cross references, headers, chapter numbers
        $snippet = preg_replace('/<sup class=["\']crossreference["\'][\s\S]*?<\/sup>/i', '', $snippet);
        $snippet = preg_replace('/<sup class=["\']footnote["\'][\s\S]*?<\/sup>/i', '', $snippet);
        $snippet = preg_replace('/<h[1-6][\s\S]*?<\/h[1-6]>/i', '', $snippet);
        $snippet = preg_replace('/<div class=["\'](crossrefs|footnotes)[\"\'][\s\S]*?<\/div>/i', '', $snippet);
        $snippet = preg_replace('/<span class=["\']chapternum["\'][^>]*>[\s\S]*?<\/span>/i', '', $snippet);
        $snippet = strip_tags($snippet);
        $snippet = str_replace("\xc2\xa0", ' ', $snippet);
        $snippet = preg_replace('/\s+/', ' ', $snippet);
        $snippet = trim(preg_replace('/Read full chapter.*$/i', '', $snippet));

        if (empty($snippet)) return null;

        // Extract clean reference from title if possible
        $refMatch = [];
        preg_match('/<title>\s*(.*?)\s*-\s*[A-Z0-9]+\s*Bible/i', $html, $refMatch);
        $reference = !empty($refMatch[1]) ? trim($refMatch[1]) : $query;

        return [
            'reference' => $reference,
            'text'      => $snippet,
        ];
    }

    /**
     * Fallback to bible-api.com
     */
    private function fetchFromBibleApi($query, $translation = 'web')
    {
        $url = 'https://bible-api.com/' . rawurlencode($query) . '?translation=' . urlencode($translation);
        $ctx = stream_context_create([
            'http' => [
                'timeout' => 6,
                'ignore_errors' => true,
                'header' => "User-Agent: LifeGen-Youth-Community/1.0\r\n"
            ]
        ]);

        $response = @file_get_contents($url, false, $ctx);
        if (!$response) return null;

        $data = json_decode($response, true);
        if (!$data || isset($data['error'])) return null;

        return [
            'reference' => $data['reference'] ?? $query,
            'text'      => trim(preg_replace('/\s+/', ' ', $data['text'] ?? '')),
        ];
    }

    /**
     * HelloAO Tagalog API fallback
     */
    private function fetchHelloAoTagalog($query)
    {
        // Simple book map for common Tagalog queries
        $bookMap = [
            'john' => 'JHN', 'juan' => 'JHN', 'jn' => 'JHN',
            'genesis' => 'GEN', 'gen' => 'GEN',
            'psalm' => 'PSA', 'psalms' => 'PSA', 'awit' => 'PSA', 'mga awit' => 'PSA',
            'proverbs' => 'PRO', 'kawikaan' => 'PRO', 'mga kawikaan' => 'PRO',
            'romans' => 'ROM', 'roma' => 'ROM',
            'matthew' => 'MAT', 'mateo' => 'MAT',
            'philippians' => 'PHP', 'filipos' => 'PHP',
            'jeremiah' => 'JER', 'jeremias' => 'JER',
            'joshua' => 'JOS', 'josue' => 'JOS',
            'isaiah' => 'ISA', 'isaias' => 'ISA',
            '1 corinthians' => '1CO', '1 corinto' => '1CO',
            '2 corinthians' => '2CO', '2 corinto' => '2CO',
            'galatians' => 'GAL', 'galacia' => 'GAL',
            'colossians' => 'COL', 'colosas' => 'COL',
            '1 timothy' => '1TI', '1 timoteo' => '1TI',
        ];

        // Match "Book Chapter:Verse"
        if (preg_match('/^([0-9]?\s*[a-zA-Z\s]+)\s+([0-9]+):?([0-9]*)/i', trim($query), $m)) {
            $rawBook = strtolower(trim($m[1]));
            $chapter = (int) $m[2];
            $verse = !empty($m[3]) ? (int) $m[3] : 1;

            if (isset($bookMap[$rawBook])) {
                $bookCode = $bookMap[$rawBook];
                $url = "https://bible.helloao.org/api/tgl_ulb/{$bookCode}/{$chapter}.json";
                $ctx = stream_context_create(['http' => ['timeout' => 5]]);
                $json = @file_get_contents($url, false, $ctx);
                if ($json) {
                    $data = json_decode($json, true);
                    if (!empty($data['chapter']['content'])) {
                        foreach ($data['chapter']['content'] as $node) {
                            if (($node['type'] ?? '') === 'verse' && ($node['number'] ?? 0) == $verse) {
                                $vText = is_array($node['content']) ? implode(' ', $node['content']) : ($node['content'] ?? '');
                                return [
                                    'reference' => ($data['book']['name'] ?? strtoupper($rawBook)) . " {$chapter}:{$verse}",
                                    'text'      => trim($vText)
                                ];
                            }
                        }
                    }
                }
            }
        }

        return null;
    }
}
