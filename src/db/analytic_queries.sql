-- Users Who Made Recipes -- 
select ltc_users.user_id, user_name, recipe_name 
from ltc_recipes 
inner join ltc_users on ltc_recipes.user_id = ltc_users.user_id 
where user_id not in (1,3);

-- Users Recipe Count -- 
select u.user_id, u.user_name, count(recipe_id) as Num_of_Recipes
from ltc_recipes r
inner join ltc_users u on r.user_id = u.user_id
group by u.user_id, u.user_name
order by Count(recipe_id) desc; 



