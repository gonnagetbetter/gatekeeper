## Part 2 - Scaling User Authentication Service

To scale a user authentication service to handle around 1000 user registration requests per second and about 100,000 login requests per second, It should be designed with a horizontally scalable architecture. 

Multiple instances of Authentication Service should be deployed with a load balancer like NGINX to evenly distribute incoming requests. 

Database should be sharded to efficiently manage write-heavy workloads during registrations, distributing user data across several database nodes. 

Additionally, Redis would be leveraged extensively for caching frequently accessed data, such as JWT tokens and user profiles, significantly enhancing login response times and reducing database load. 

Continuous monitoring would be established using tools like Prometheus to track system performance and dynamically scale infrastructure as necessary.

## Part 3 - Implementing Social Login

To add social login application should be registered with each chosen identity provider such as Google, Facebook or Twitter, obtain the client identifier and secret, specify the redirect URIs, then implement the OAuth 2.0 authorisation flow inside Authentication service and finally process the user data the provider returns so that the person can be authenticated within this system.

During configuration the application is recorded in the provider's developer portal, the issued credentials are stored securely and the exact redirect endpoint is declared. The web interface offers branded buttons that open the provider's consent screen; once the user approves access the browser is redirected with an authorisation code. 

App's authentication service  recieves that code, exchanges it for an access token, requests the user's profile, creates or updates the corresponding record in the database and issues ownJWT for session management.

### Sequence Diagram

The full interaction is summarised in the following sequence diagram, which shows the initial click, the outbound authorisation request, the token exchange and the creation of a session token:

[![](https://img.plantuml.biz/plantuml/svg/RPBBJiCm44NtblmFewx88Yej3m52g5M11MA1-X1YQTaZi1hiC9xGtyTESPfMMJcPENDyxMGMM14ttvKKIhCds0GaAUfOjDhMoZ6CFdn3CA_h4QYGrfFsockhAdWZ_siDKalb5ocaI4Oe7z8atC7Pf815PVKMNlsdTLAaSkpcYOHC2vWt_0LB_6amy9wvByiZwAA8VMC9DGDxE4cHxNdp_kHb0K-Eu_E2qA3ZE1Uaw8ZoaFMgjyVEnaHjh8KtE9Zxke1dJpj5fWyUn9tt9dcv8GThlyNXIxWjyldRRmAFYjMWR7BUsNhWlp4pwTO95UDuKvkuxD4bQa-cWzjQegUTyULzFLvX2DPtMQMOeJFjB_C7)](https://editor.plantuml.com/uml/RPBBJiCm44NtblmFewx88Yej3m52g5M11MA1-X1YQTaZi1hiC9xGtyTESPfMMJcPENDyxMGMM14ttvKKIhCds0GaAUfOjDhMoZ6CFdn3CA_h4QYGrfFsockhAdWZ_siDKalb5ocaI4Oe7z8atC7Pf815PVKMNlsdTLAaSkpcYOHC2vWt_0LB_6amy9wvByiZwAA8VMC9DGDxE4cHxNdp_kHb0K-Eu_E2qA3ZE1Uaw8ZoaFMgjyVEnaHjh8KtE9Zxke1dJpj5fWyUn9tt9dcv8GThlyNXIxWjyldRRmAFYjMWR7BUsNhWlp4pwTO95UDuKvkuxD4bQa-cWzjQegUTyULzFLvX2DPtMQMOeJFjB_C7)
