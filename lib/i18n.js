export const I18N = {
  ka: {
    cabinet: "ჩემი კაბინეტი",
    library: "ჩემი ბიბლიოთეკა",
    catalogSearch: "მოძებნე ფილმები, სერიალები და ანიმე…",
    discoverTitle: "აღმოაჩინე ახალი ისტორიები",
    discoverSub: "მოძებნე კატალოგში და დაამატე სათაურები შენს კოლექციას.",
    connectCatalog: "კატალოგში ძებნისთვის დააკავშირე TMDB.",
    connectSearch: "ძებნის დაკავშირება",
    catalogEmpty: "დაიწყე სათაურის აკრეფა ფილმებისა და სერიალების მოსაძებნად.",
    signInSync: "შედი ანგარიშში ბიბლიოთეკის სინქრონიზაციისთვის",
    home: "მთავარი",
    movies: "ფილმები",
    anime: "ანიმე",
    series: "სერიალები",
    yourStuff: "თქვენი კოლექცია",
    watchlist: "სანახავი სია",
    history: "ნანახი ისტორია",
    searchPlaceholder: "მოძებნეთ თქვენს ბიბლიოთეკაში…",
    addTitle: "+ სათაურის დამატება",
    all: "ყველა",
    want: "მინდა ვუყურო",
    watching: "ვუყურებ",
    seen: "ნანახი",
    dropped: "მიტოვებული",
    sortRecent: "ახლახან დამატებული",
    sortRating: "უმაღლესი რეიტინგი",
    sortTitle: "სათაური A–Z",
    heroTitle: "უყურე.\nშეაფასე.\nდაიმახსოვრე.",
    heroSub:
      "ფილმები, ანიმე და სერიალები ერთ ბიბლიოთეკაში — სინქრონიზებული ყველა თქვენს მოწყობილობაზე.",
    statWatched: "ნანახი",
    statWatching: "ვუყურებ",
    statWant: "სანახავი",
    statAvg: "საშუალო რეიტინგი",
    secWatching: "ამჟამად ვუყურებ",
    secWant: "სანახავი სია",
    secSeen: "ბოლოს ნანახი",
    seeAll: "ყველას ნახვა",
    emptyLib:
      "თქვენი ბიბლიოთეკა ცარიელია. დააჭირეთ „+ სათაურის დამატება“-ს დასაწყებად.",
    emptyFilter: "აქ ჯერ არაფერია.",
    exportBackup: "სარეზერვო ექსპორტი",
    importLetterboxd: "Letterboxd იმპორტი",
    findPosters: "პოსტერების ძებნა",
    importBackup: "სარეზერვო იმპორტი",
    storageNote: "ლოკალური და Cloud სინქრონიზაცია",
    rate: "შეაფასე",
    notRated: "შეუფასებელი",
    seasonAbbr: "სეზონი",
    episodeAbbr: "სერია",
    trailer: "თრეილერი",
  },
  en: {
    cabinet: "My cabinet",
    library: "My library",
    catalogSearch: "Search movies, series and anime…",
    discoverTitle: "Discover new stories",
    discoverSub: "Search the catalog and add titles to your collection.",
    connectCatalog: "Connect TMDB to search the catalog.",
    connectSearch: "Connect search",
    catalogEmpty: "Start typing a title to discover movies and series.",
    signInSync: "Sign in to sync your library",
    home: "Home",
    movies: "Movies",
    anime: "Anime",
    series: "Series",
    yourStuff: "Your stuff",
    watchlist: "Watchlist",
    history: "History",
    searchPlaceholder: "Search your library…",
    addTitle: "+ Add title",
    all: "All",
    want: "Want to watch",
    watching: "Watching",
    seen: "Watched",
    dropped: "Dropped",
    sortRecent: "Recently added",
    sortRating: "Highest rated",
    sortTitle: "Title A–Z",
    heroTitle: "Watch.\nRate.\nRemember.",
    heroSub:
      "Movies, anime and series in one library, saved and synced across all your devices.",
    statWatched: "Watched",
    statWatching: "Watching",
    statWant: "Want to watch",
    statAvg: "Average rating",
    secWatching: "Watching now",
    secWant: "Want to watch",
    secSeen: "Recently watched",
    seeAll: "See all",
    emptyLib: "Your library is empty. Click + Add title to start.",
    emptyFilter: "Nothing here yet.",
    exportBackup: "Export backup",
    importLetterboxd: "Import Letterboxd",
    findPosters: "Find posters",
    importBackup: "Import backup",
    storageNote: "Local storage & Cloud sync",
    rate: "Rate",
    notRated: "Not rated",
    seasonAbbr: "S",
    episodeAbbr: "Ep",
    trailer: "Trailer",
  },
};

export const translate = (lang, key) =>
  I18N[lang]?.[key] || I18N.en[key] || key;

export function translateAuthMessage(lang, message) {
  if (!message) return "";
  const text = typeof message === "string" ? message : message.message || "";
  const messages = [
    [
      "აღდგენის ბმული გაგზავნილია. შეამოწმეთ ელფოსტა (Inbox / Spam).",
      "A reset link has been sent. Check your email (Inbox / Spam).",
    ],
    ["პაროლი წარმატებით განახლდა!", "Your password has been updated!"],
    [
      "რეგისტრაცია მიღებულია! შესვლამდე დაადასტურეთ ელფოსტაზე გამოგზავნილი ბმული.",
      "Registration received! Confirm the link sent to your email before signing in.",
    ],
    ["წარმატებით შეხვედით!", "You have signed in successfully!"],
  ];
  const match = messages.find(([ka, en]) => text === ka || text === en);
  if (match) return match[lang === "ka" ? 0 : 1];
  if (lang !== "ka") return text;
  const errors = [
    [
      /email not confirmed/i,
      "ელფოსტა ჯერ არ არის დადასტურებული. შეამოწმეთ Inbox ან Spam და დააჭირეთ დადასტურების ბმულს.",
    ],
    [
      /invalid (login )?credentials/i,
      "არასწორი ელფოსტა ან პაროლი. გადაამოწმეთ მონაცემები და ელფოსტის დადასტურება.",
    ],
    [
      /already registered|already in use/i,
      "ეს ელფოსტა უკვე დარეგისტრირებულია. გადადით შესვლის ჩანართზე.",
    ],
    [
      /password should be at least|at least 6 characters/i,
      "პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან.",
    ],
    [
      /rate limit|too many requests/i,
      "ძალიან ბევრი მცდელობა. მოიცადეთ რამდენიმე წუთი და სცადეთ ხელახლა.",
    ],
  ];
  return errors.find(([pattern]) => pattern.test(text))?.[1] || text;
}
