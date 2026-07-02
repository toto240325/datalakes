


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
------------------------






need to display (EXT) if SP

first option chosen by enter

picture after name, not before

important to have date of last download

detailed info when hovering, + picture

summary of organigram that can be pasted in mynotes3

mobile version; 0.0.0.0; please on server ?

A.4.005 special case

search on first name + dg + anythign ?

SNC data ?
what is considered public is what is in who's who of OP, address book of outlook (which is in C:\Users\derruer\AppData\Local\Microsoft\Outlook\Offline Address Books\09eadbe0-0ab9-418a-840d-5a5559cc00d8)

maybe other interesting info in address book ?

any useful skills, or steering, or mcp, or hook to add here ?



