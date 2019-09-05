--
-- PostgreSQL database dump
--

-- Dumped from database version -
-- Dumped by pg_dump version -

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: website; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA website;


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: users; Type: TABLE; Schema: website; Owner: -
--

CREATE TABLE website.users (
    user_id smallint NOT NULL,
    username character varying(40) NOT NULL,
    password character(246) NOT NULL,
    email character varying(254) NOT NULL,
    usertype smallint DEFAULT 1 NOT NULL,
    active boolean DEFAULT false NOT NULL,
    createdate timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    lastlogin timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_id_seq; Type: SEQUENCE; Schema: website; Owner: -
--

CREATE SEQUENCE website.user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 36000
    CACHE 1;


--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: website; Owner: -
--

ALTER SEQUENCE website.user_id_seq OWNED BY website.users.user_id;


--
-- Name: users_activation; Type: TABLE; Schema: website; Owner: -
--

CREATE TABLE website.users_activation (
    user_id smallint NOT NULL,
    activation_key character varying NOT NULL
);


--
-- Name: users user_id; Type: DEFAULT; Schema: website; Owner: -
--

ALTER TABLE ONLY website.users ALTER COLUMN user_id SET DEFAULT nextval('website.user_id_seq'::regclass);


--
-- Name: users_activation users_activation_pkey; Type: CONSTRAINT; Schema: website; Owner: -
--

ALTER TABLE ONLY website.users_activation
    ADD CONSTRAINT users_activation_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: website; Owner: -
--

ALTER TABLE ONLY website.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: website; Owner: -
--

ALTER TABLE ONLY website.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: website; Owner: -
--

ALTER TABLE ONLY website.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: users_activation users_activation_user_id_fkey; Type: FK CONSTRAINT; Schema: website; Owner: -
--

ALTER TABLE ONLY website.users_activation
    ADD CONSTRAINT users_activation_user_id_fkey FOREIGN KEY (user_id) REFERENCES website.users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

