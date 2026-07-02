


in this work space I would like to develop a project that will help me learn about datalakes, duckdb, maybe parquet files, etc.  Here is the description of a demo I saw recently, and I would like to do something similaire, but in node.js instead of in springboot, locally and not in the cloud; it should at least work with the belgium weather data as described, but should be thought to be extensible to other kinds of data sources.

Context of the demo:
There is a need to efficiently query and analyze various data sets stored in data lakes by internal users, specifically teams working with agricultural and digital data lakes. The challenge includes managing data stored in different formats and enabling AI-driven SQL queries on these data sets, while ensuring data isolation per lake and version control for query skills. The solution targets internal users rather than citizens, addressing the need for fast, scalable, and manageable analytical queries.

Solution
The demo presented a generic AI Data Agent that performs SQL queries on any data set within a single data lake using skills defined and editable in the AI toolbox. The agent uses an architecture based on a Spring AI MCP server exposing tools to list, load, and run queries on data stored in Apache Parquet files on on-premise S3 buckets. The demo included creating a new data set (weather data for Belgium 2026), converting CSV to Parquet, uploading it to S3, defining a new skill, and querying the data via the AI assistant.

Benefit
Enables fast integration of new data sets and skills, demonstrated by creating and querying a new weather data set in less than an hour.
Supports isolated data lakes with multiple data sets that can be combined for complex queries.
Provides version control for skills to allow rollback in case of errors, improving reliability.
Uses Parquet format for efficient, compressed, and segmented storage optimized for analytical queries.
Facilitates AI-driven SQL query execution through an assistant interface, improving ease of use for internal users.
Key Points
Each AI Data Agent targets a single data lake, which can contain multiple combinable data sets.
Skills define how to query data sets and are versioned separately from the data stored in Parquet files.
The system uses DuckDB to run SQL queries directly on Parquet files stored in on-premise S3 buckets.
The AI assistant interacts with the agent by listing skills, loading relevant skills based on the query, running SQL queries, and returning results.
New data sets can be onboarded quickly by converting CSV files to Parquet, uploading to S3, creating skills, and querying via the AI assistant.

---------------------------------
I would like you to explore this page:
https://citnet.tech.ec.europa.eu/CITnet/confluence/spaces/APIGTW/pages/1508864135/Tutorial+Step-by-step+for+Business+Users+how+to+consume+APIs+via+the+WSO2+API+GTW

You can do this by using playwright and using my edge session currently running on localhost:9222 in debug mode, with my credendials.  Can you read that page ?

-------------------------
based on the data we have collected on the people and on the organigram (structure and names of the DGs/directorates/units), please propose a way to exploit as well as possible.  My goal is to have a webapp with a search box where i can enter a name and the app will represent for me the organigram 1 level above and one level below that person, with the names and title of the people aroud that person, and ideally the possibility to navigate in that organigram
-----------------
A.4.005 special case

in "C:\Users\derruer\European Commission\GRP-EC_DIGIT.A.4 - General\Secretariat\Organigramme\Unit A4 staff 2026-06-11.xlsx" you will find an excel file; the first sheet of that excel workbook contains the list of staff in DIGIT.A.4, which should be very close to the one we downloaded from the other sources.  But it contains additional information.  Column L contains the status of the persons (STAT for statutory, and PREST for Prestataire, i.e. same as service provider or EXT).  The service providers are administratively all put in a sector called DIGIT.A.4.005.  In fact, in reality they are part of the normal sectors (like DIGIT.A.4.001 to DIGIT.A.4.004), and this "real sector" where they really belong is indicated in column G.  And in each sector, they are part of a team, indicated in column F.  So what I would like you to do is to consider an exception to the general rule, and that specifically for DIGIT.A.4, you use that addition Excel information in order to create in the organigram of the DIGIT.A.4.001 to DIGIT.A.4.004 sectors sub-entities, which are in fact the teams indicated for each "PREST".  Clear for you ?

--------------------
I note that some people could not be mapped between ldap data and sysper data, mainly because they have composed names.  For those cases (and not for those where you managed to match based on the names), you might try to use the phone number which is known in both datasources.  After having done that, you might want to try again the matching with the DIGIT.A.4.005 PREST, for which several of them could not be matched based only on the names

------------------------
we learned a lot of things, that I think it would be wise to try and recap in one of our files (either readme or catch-up) in order to not have to rediscover them later; also it would be useful to make sure that the readme contains information about how to rerun the whole cycle, to update the data, in a few weeks, when we will both have forgotten how to do it.  It would also be useful to specify in the readme how to install this app from the git repo.  And it might also be useful to have the server listining on 0.0.0.0 and on port 8087, so that it doesn't collide with another server on 8087 and so that it can be accessed from any machine in my LAN
------------------------------
I realise that the matching on name only might have some limitations if we have 2 people with exactly the same name.  here is one example : stephen collins.  There is such a Stephen Collins in DIGIT.A.4, but also in RTD.REA
---------------------------
search on first name + dg + anythign ?
----------------------------
what is considered public is what is in who's who of OP (the first data source that we scraped together), the LDAP service (for which you have the active_directory.ps1 script), the address book of outlook (which is in C:\Users\derruer\AppData\Local\Microsoft\Outlook\Offline Address Books\09eadbe0-0ab9-418a-840d-5a5559cc00d8).  All the data items that can be found there can be considered (semi)public information.  Meaning that I would like you to check if the data that we get from Sysper don't contain other kind of data items, which probably should be considered as non (semi)public information, and which we shouldn't exploit (I might have an extra visibility in Sysper, in comparison to the public data sources that I mentioned, and I woudln't want to use that information that only me have access to, because I might want later to share this app with people who only have access to the public information and not to the information in sysper to which I have access but not everybody).  So 2 questions: can you have access and check the outlook address book that I mentioned ? and can you compare the public data that we can use, make sure that we don't use not public data, and identify those additional data item (like email, office, etc) that we could exploit (because they are public) but that we haven't yet exploited in our web app and data source
------------------------

maybe other interesting info in address book ?

any useful skills, or steering, or mcp, or hook to add here ?

------------------------

summary of organigram that can be pasted in mynotes3

mobile version; 0.0.0.0; please on server ?


