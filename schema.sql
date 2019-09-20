
CREATE TABLE IF NOT EXISTS locations(

    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    formatted_query VARCHAR(255),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7)

);

CREATE TABLE IF NOT EXISTS weather(

    forecast VARCHAR (255),
    time NUMERIC (10,7)
);


CREATE TABLE IF NOT EXISTS events(

    link VARCHAR(255),
    name VARCHAR (255),
    event_date VARCHAR(255),
    summary VARCHAR(255)

);
